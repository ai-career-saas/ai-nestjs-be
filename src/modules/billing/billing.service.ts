import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import Stripe = require("stripe");
import { DRIZZLE, DrizzleDB } from "../../database.module";
import { plans, subscriptions, users } from "../../database/schema";

@Injectable()
export class BillingService {
  private stripe: Stripe;

  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
  }

  private getSubscriptionPeriodEnd(sub: Stripe.Subscription): Date | undefined {
    const items = sub.items?.data;
    if (!items?.length) return undefined;
    const periodEnd = Math.max(...items.map((item) => item.current_period_end));
    return new Date(periodEnd * 1000);
  }

  private getInvoiceSubscriptionId(
    invoice: Stripe.Invoice,
  ): string | undefined {
    const subscription = invoice.parent?.subscription_details?.subscription;
    if (!subscription) return undefined;
    return typeof subscription === "string" ? subscription : subscription.id;
  }

  private getSubscriptionPriceId(sub: Stripe.Subscription): string | undefined {
    return sub.items?.data?.[0]?.price?.id;
  }

  private getCheckoutSessionSubscriptionId(
    session: Stripe.Checkout.Session,
  ): string | undefined {
    const subscription = session.subscription;
    if (!subscription) return undefined;
    return typeof subscription === "string" ? subscription : subscription.id;
  }

  private async getPlanIdByStripePriceId(
    stripePriceId: string,
  ): Promise<string | undefined> {
    const [plan] = await this.db
      .select({ id: plans.id })
      .from(plans)
      .where(eq(plans.stripePriceId, stripePriceId))
      .limit(1);
    return plan?.id;
  }

  private mapStripeSubscriptionStatus(
    status: Stripe.Subscription.Status,
  ): string {
    if (status === "active" || status === "trialing") return "active";
    if (status === "past_due" || status === "unpaid") return "halted";
    if (status === "canceled") return "cancelled";
    return "pending";
  }

  // ------------------------------

  async createSubscription(userId: string, planId: string) {
    const [plan] = await this.db
      .select()
      .from(plans)
      .where(eq(plans.id, planId))
      .limit(1);
    if (!plan) throw new NotFoundException("Plan not found");

    if (!plan.stripePriceId) {
      throw new BadRequestException(
        "This plan does not support Stripe billing",
      );
    }

    const [user] = await this.db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) throw new NotFoundException("User not found");

    let customerId: string;

    const [existingSub] = await this.db
      .select({ stripeCustomerId: subscriptions.stripeCustomerId })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    if (existingSub?.stripeCustomerId) {
      customerId = existingSub.stripeCustomerId;
    } else {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId },
      });

      customerId = customer.id;
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/billing/cancel`,
      metadata: { userId, planId },
    });

    await this.db
      .insert(subscriptions)
      .values({
        userId,
        planId,
        stripeCustomerId: customerId,
        status: "pending",
      })
      .onConflictDoUpdate({
        target: subscriptions.userId,
        set: {
          planId,
          stripeCustomerId: customerId,
          status: "pending",
          updatedAt: new Date(),
        },
      });

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
      planName: plan.name,
      priceThb: plan.priceThb,
    };
  }

  async handleWebhook(rawBody: string, signature: string) {
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET || "",
      );
    } catch {
      throw new BadRequestException("Invalid webhook signature");
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const planId = session.metadata?.planId;
        if (!userId || !planId || session.payment_status !== "paid") break;

        const stripeSubscriptionId =
          this.getCheckoutSessionSubscriptionId(session);
        const [plan] = await this.db
          .select({ id: plans.id })
          .from(plans)
          .where(eq(plans.id, planId))
          .limit(1);
        if (!plan) break;

        await this.db
          .update(subscriptions)
          .set({
            planId: plan.id,
            status: "active",
            ...(stripeSubscriptionId ? { stripeSubscriptionId } : {}),
          })
          .where(eq(subscriptions.userId, userId));
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        const periodEnd = this.getSubscriptionPeriodEnd(sub);
        const stripePriceId = this.getSubscriptionPriceId(sub);
        const planId = stripePriceId
          ? await this.getPlanIdByStripePriceId(stripePriceId)
          : undefined;
        await this.db
          .update(subscriptions)
          .set({
            status: this.mapStripeSubscriptionStatus(sub.status),
            stripeSubscriptionId: sub.id,
            ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}),
            ...(planId ? { planId } : {}),
          })
          .where(eq(subscriptions.stripeCustomerId, sub.customer as string));
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = this.getInvoiceSubscriptionId(invoice);
        if (!subscriptionId) break;
        const sub = await this.stripe.subscriptions.retrieve(subscriptionId);
        const periodEnd = this.getSubscriptionPeriodEnd(sub);
        await this.db
          .update(subscriptions)
          .set({
            status: "active",
            ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}),
          })
          .where(eq(subscriptions.stripeSubscriptionId, sub.id));
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await this.db
          .update(subscriptions)
          .set({ status: "cancelled" })
          .where(eq(subscriptions.stripeSubscriptionId, sub.id));

        const [freePlan] = await this.db
          .select({ id: plans.id })
          .from(plans)
          .where(eq(plans.name, "Free"))
          .limit(1);
        if (freePlan) {
          await this.db
            .update(subscriptions)
            .set({ planId: freePlan.id })
            .where(eq(subscriptions.stripeSubscriptionId, sub.id));
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = this.getInvoiceSubscriptionId(invoice);
        if (!subscriptionId) break;
        await this.db
          .update(subscriptions)
          .set({ status: "halted" })
          .where(eq(subscriptions.stripeSubscriptionId, subscriptionId));
        break;
      }
    }

    return { status: "ok", event: event.type };
  }

  async cancelSubscription(userId: string, immediately = false) {
    const [sub] = await this.db
      .select({ stripeSubscriptionId: subscriptions.stripeSubscriptionId })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, "active"),
        ),
      )
      .limit(1);
    if (!sub.stripeSubscriptionId)
      throw new NotFoundException("No active subscription");

    if (immediately) {
      await this.stripe.subscriptions.cancel(sub.stripeSubscriptionId);
    } else {
      await this.stripe.subscriptions.update(sub.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    }

    const [updated] = await this.db
      .update(subscriptions)
      .set({
        cancelAtPeriodEnd: !immediately,
        status: immediately ? "canceled" : "active",
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.userId, userId))
      .returning({
        status: subscriptions.status,
        cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
      });

    return updated;
  }

  async resumeSubscription(userId: string) {
    const [sub] = await this.db
      .select({ stripeSubscriptionId: subscriptions.stripeSubscriptionId })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    if (!sub?.stripeSubscriptionId) {
      throw new NotFoundException("No subscription for this user");
    }

    await this.stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    const [updated] = await this.db
      .update(subscriptions)
      .set({ cancelAtPeriodEnd: false, updatedAt: new Date() })
      .where(eq(subscriptions.userId, userId))
      .returning({ cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd });

    return updated;
  }

  async getCurrentSubscription(userId: string) {
    const [sub] = await this.db
      .select({
        status: subscriptions.status,
        plan_name: plans.name,
        price_thb: plans.priceThb,
        quota: plans.quota,
        features: plans.features,
        description: plans.description,
        subscriptionStatus: subscriptions.status,
        cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
      })
      .from(subscriptions)
      .innerJoin(plans, eq(plans.id, subscriptions.planId))
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    return sub || null;
  }

  async listInvoices(userId: string) {
    const [sub] = await this.db
      .select({ stripeCustomerId: subscriptions.stripeCustomerId })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    if (!sub?.stripeCustomerId) {
      throw new BadRequestException("No billing account for this user");
    }

    const invoices = await this.stripe.invoices.list({
      customer: sub.stripeCustomerId,
      limit: 100,
    });

    return invoices.data.map((invoice) => ({
      id: invoice.id,
      amountPaid: invoice.amount_paid,
      currency: invoice.currency,
      status: invoice.status,
      createdAt: new Date(invoice.created * 1000),
      hostedInvoiceUrl: invoice.hosted_invoice_url,
    }));
  }

  async portalSubscription(userId: string) {
    const [sub] = await this.db
      .select({ stripeCustomerId: subscriptions.stripeCustomerId })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    console.log(userId);

    if (!sub?.stripeCustomerId) {
      throw new BadRequestException("No billing account for this user");
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/settings/subscription`,
    });

    return { url: session.url };
  }
}
