import { BadRequestException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockDb, renderSql } from "../../utils/test/mockdb";
import { BillingService } from "./billing.service";

const WEBHOOK_SECRET = "whsec_test_secret";

describe("BillingService", () => {
  let mock: ReturnType<typeof createMockDb>;
  let service: BillingService;
  let stripe: {
    customers: { create: ReturnType<typeof vi.fn> };
    checkout: { sessions: { create: ReturnType<typeof vi.fn> } };
    subscriptions: {
      retrieve: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      cancel: ReturnType<typeof vi.fn>;
    };
    invoices: { list: ReturnType<typeof vi.fn> };
    billingPortal: { sessions: { create: ReturnType<typeof vi.fn> } };
  };
  let signEvent: (type: string, object: unknown) => { rawBody: string; signature: string };

  beforeEach(() => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_dummy");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", WEBHOOK_SECRET);
    vi.stubEnv("FRONTEND_URL", "https://app.example.com");

    mock = createMockDb();
    service = new BillingService(mock.db);

    // Keep the real Stripe webhook verification (no network involved) but replace every
    // API resource with mocks so no request ever leaves the test process.
    const realWebhooks = (service as any).stripe.webhooks;
    stripe = {
      customers: { create: vi.fn() },
      checkout: { sessions: { create: vi.fn() } },
      subscriptions: { retrieve: vi.fn(), update: vi.fn(), cancel: vi.fn() },
      invoices: { list: vi.fn() },
      billingPortal: { sessions: { create: vi.fn() } },
    };
    (service as any).stripe = { ...stripe, webhooks: realWebhooks };

    signEvent = (type, object) => {
      const rawBody = JSON.stringify({ id: "evt_1", object: "event", type, data: { object } });
      const signature = realWebhooks.generateTestHeaderString({
        payload: rawBody,
        secret: WEBHOOK_SECRET,
      });
      return { rawBody, signature };
    };
  });

  const webhook = (type: string, object: unknown) => {
    const { rawBody, signature } = signEvent(type, object);
    return service.handleWebhook(rawBody, signature);
  };

  // ────────────────────────────────────────────────────────────────────────
  describe("createSubscription", () => {
    const plan = { id: "plan-pro", name: "Pro", priceThb: 299, stripePriceId: "price_pro" };
    const user = { email: "nam@example.com", name: "Nam" };

    beforeEach(() => {
      stripe.customers.create.mockResolvedValue({ id: "cus_new" });
      stripe.checkout.sessions.create.mockResolvedValue({
        id: "cs_1",
        url: "https://checkout.stripe.test/cs_1",
      });
    });

    it("throws NotFoundException when the plan does not exist", async () => {
      mock.enqueue([]);

      await expect(service.createSubscription("u1", "nope")).rejects.toThrow(
        new NotFoundException("Plan not found"),
      );
      expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
    });

    it("throws BadRequestException for a plan without a Stripe price (e.g. Free)", async () => {
      mock.enqueue([{ ...plan, stripePriceId: null }]);

      await expect(service.createSubscription("u1", "plan-free")).rejects.toThrow(
        BadRequestException,
      );
      expect(stripe.customers.create).not.toHaveBeenCalled();
    });

    it("throws NotFoundException when the user does not exist", async () => {
      mock.enqueue([plan], []);

      await expect(service.createSubscription("ghost", "plan-pro")).rejects.toThrow(
        new NotFoundException("User not found"),
      );
      expect(stripe.customers.create).not.toHaveBeenCalled();
    });

    it("creates a Stripe customer for a first-time subscriber and a subscription checkout session", async () => {
      mock.enqueue([plan], [user], [], []);

      const result = await service.createSubscription("u1", "plan-pro");

      expect(stripe.customers.create).toHaveBeenCalledWith({
        email: "nam@example.com",
        name: "Nam",
        metadata: { userId: "u1" },
      });
      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith({
        mode: "subscription",
        customer: "cus_new",
        line_items: [{ price: "price_pro", quantity: 1 }],
        success_url: "https://app.example.com/billing/success?session_id={CHECKOUT_SESSION_ID}",
        cancel_url: "https://app.example.com/billing/cancel",
        metadata: { userId: "u1", planId: "plan-pro" },
      });
      expect(result).toEqual({
        checkoutUrl: "https://checkout.stripe.test/cs_1",
        sessionId: "cs_1",
        planName: "Pro",
        priceThb: 299,
      });
    });

    it("reuses the existing Stripe customer instead of creating a duplicate", async () => {
      mock.enqueue([plan], [user], [{ stripeCustomerId: "cus_existing" }], []);

      await service.createSubscription("u1", "plan-pro");

      expect(stripe.customers.create).not.toHaveBeenCalled();
      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({ customer: "cus_existing" }),
      );
    });

    it("records the subscription as pending until the payment webhook confirms it", async () => {
      mock.enqueue([plan], [user], [], []);

      await service.createSubscription("u1", "plan-pro");

      const upsert = mock.queries[3];
      expect(upsert.kind).toBe("insert");
      expect(upsert.calls.values[0]).toEqual({
        userId: "u1",
        planId: "plan-pro",
        stripeCustomerId: "cus_new",
        status: "pending",
      });
      expect(upsert.calls.onConflictDoUpdate[0]).toMatchObject({
        set: { planId: "plan-pro", stripeCustomerId: "cus_new", status: "pending" },
      });
    });

    it("does not write a subscription row when Stripe checkout creation fails", async () => {
      mock.enqueue([plan], [user], []);
      stripe.checkout.sessions.create.mockRejectedValue(new Error("stripe down"));

      await expect(service.createSubscription("u1", "plan-pro")).rejects.toThrow("stripe down");
      expect(mock.queries).toHaveLength(3);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  describe("handleWebhook", () => {
    it("rejects a payload whose signature does not match", async () => {
      const { rawBody } = signEvent("invoice.payment_failed", {});

      await expect(service.handleWebhook(rawBody, "t=1,v1=deadbeef")).rejects.toThrow(
        new BadRequestException("Invalid webhook signature"),
      );
      expect(mock.queries).toHaveLength(0);
    });

    it("rejects a validly signed payload that was modified afterwards", async () => {
      const { rawBody, signature } = signEvent("invoice.payment_failed", {});

      await expect(
        service.handleWebhook(rawBody.replace("evt_1", "evt_2"), signature),
      ).rejects.toThrow(BadRequestException);
    });

    it("acknowledges event types it does not handle without touching the database", async () => {
      const result = await webhook("customer.created", { id: "cus_1" });

      expect(result).toEqual({ status: "ok", event: "customer.created" });
      expect(mock.queries).toHaveLength(0);
    });

    describe("checkout.session.completed", () => {
      const session = {
        payment_status: "paid",
        subscription: "sub_1",
        metadata: { userId: "u1", planId: "plan-pro" },
      };

      it("activates the plan for the user and stores the Stripe subscription id", async () => {
        mock.enqueue([{ id: "plan-pro" }], []);

        const result = await webhook("checkout.session.completed", session);

        expect(result).toEqual({ status: "ok", event: "checkout.session.completed" });
        const update = mock.queries[1];
        expect(update.kind).toBe("update");
        expect(update.calls.set[0]).toEqual({
          planId: "plan-pro",
          status: "active",
          stripeSubscriptionId: "sub_1",
        });
        expect(renderSql(update.calls.where[0]).params).toEqual(["u1"]);
      });

      it("accepts an expanded subscription object as well as an id string", async () => {
        mock.enqueue([{ id: "plan-pro" }], []);

        await webhook("checkout.session.completed", {
          ...session,
          subscription: { id: "sub_obj" },
        });

        expect(mock.queries[1].calls.set[0]).toMatchObject({ stripeSubscriptionId: "sub_obj" });
      });

      it("does not overwrite the stored subscription id when the session has none", async () => {
        mock.enqueue([{ id: "plan-pro" }], []);

        await webhook("checkout.session.completed", { ...session, subscription: null });

        expect(mock.queries[1].calls.set[0]).toEqual({ planId: "plan-pro", status: "active" });
      });

      it.each([
        ["is not paid", { ...session, payment_status: "unpaid" }],
        ["has no userId metadata", { ...session, metadata: { planId: "plan-pro" } }],
        ["has no planId metadata", { ...session, metadata: { userId: "u1" } }],
        ["has no metadata", { ...session, metadata: null }],
      ])("ignores a checkout session that %s", async (_label, payload) => {
        await webhook("checkout.session.completed", payload);

        expect(mock.queries).toHaveLength(0);
      });

      it("does not activate anything when the plan in the metadata no longer exists", async () => {
        mock.enqueue([]);

        await webhook("checkout.session.completed", session);

        expect(mock.queries).toHaveLength(1);
        expect(mock.queries.some((q) => q.kind === "update")).toBe(false);
      });
    });

    describe.each(["customer.subscription.created", "customer.subscription.updated"])(
      "%s",
      (eventType) => {
        const subscription = (overrides: Record<string, unknown> = {}) => ({
          id: "sub_1",
          customer: "cus_1",
          status: "active",
          items: {
            data: [
              { current_period_end: 1_800_000_000, price: { id: "price_pro" } },
              { current_period_end: 1_900_000_000, price: { id: "price_addon" } },
            ],
          },
          ...overrides,
        });

        it("syncs status, subscription id, the latest period end and the plan matching the price", async () => {
          mock.enqueue([{ id: "plan-pro" }], []);

          await webhook(eventType, subscription());

          const [planLookup, update] = mock.queries;
          expect(renderSql(planLookup.calls.where[0]).params).toEqual(["price_pro"]);
          expect(update.calls.set[0]).toEqual({
            status: "active",
            stripeSubscriptionId: "sub_1",
            currentPeriodEnd: new Date(1_900_000_000 * 1000),
            planId: "plan-pro",
          });
          expect(renderSql(update.calls.where[0]).params).toEqual(["cus_1"]);
        });

        it.each([
          ["active", "active"],
          ["trialing", "active"],
          ["past_due", "halted"],
          ["unpaid", "halted"],
          ["canceled", "cancelled"],
          ["incomplete", "pending"],
          ["incomplete_expired", "pending"],
          ["paused", "pending"],
        ])("maps Stripe status %s to %s", async (stripeStatus, expected) => {
          mock.enqueue([{ id: "plan-pro" }], []);

          await webhook(eventType, subscription({ status: stripeStatus }));

          expect(mock.queries[1].calls.set[0]).toMatchObject({ status: expected });
        });

        it("keeps the current plan when the price does not match any known plan", async () => {
          mock.enqueue([], []);

          await webhook(eventType, subscription());

          expect(mock.queries[1].calls.set[0]).not.toHaveProperty("planId");
        });

        it("skips plan lookup and period end when the subscription has no items", async () => {
          await webhook(eventType, subscription({ items: { data: [] } }));

          expect(mock.queries).toHaveLength(1);
          expect(mock.queries[0].calls.set[0]).toEqual({
            status: "active",
            stripeSubscriptionId: "sub_1",
          });
        });
      },
    );

    describe("invoice.payment_succeeded", () => {
      it("marks the subscription active and refreshes the period end from Stripe", async () => {
        stripe.subscriptions.retrieve.mockResolvedValue({
          id: "sub_1",
          items: { data: [{ current_period_end: 1_800_000_000 }] },
        });

        await webhook("invoice.payment_succeeded", {
          parent: { subscription_details: { subscription: "sub_1" } },
        });

        expect(stripe.subscriptions.retrieve).toHaveBeenCalledWith("sub_1");
        const [update] = mock.queries;
        expect(update.calls.set[0]).toEqual({
          status: "active",
          currentPeriodEnd: new Date(1_800_000_000 * 1000),
        });
        expect(renderSql(update.calls.where[0]).params).toEqual(["sub_1"]);
      });

      it("accepts an expanded subscription object on the invoice", async () => {
        stripe.subscriptions.retrieve.mockResolvedValue({ id: "sub_2", items: { data: [] } });

        await webhook("invoice.payment_succeeded", {
          parent: { subscription_details: { subscription: { id: "sub_2" } } },
        });

        expect(stripe.subscriptions.retrieve).toHaveBeenCalledWith("sub_2");
        expect(mock.queries[0].calls.set[0]).toEqual({ status: "active" });
      });

      it.each([
        ["no parent", {}],
        ["no subscription details", { parent: {} }],
        ["a one-off invoice", { parent: { subscription_details: { subscription: null } } }],
      ])("ignores an invoice with %s", async (_label, invoice) => {
        await webhook("invoice.payment_succeeded", invoice);

        expect(stripe.subscriptions.retrieve).not.toHaveBeenCalled();
        expect(mock.queries).toHaveLength(0);
      });
    });

    describe("invoice.payment_failed", () => {
      it("halts the subscription of the failed invoice", async () => {
        await webhook("invoice.payment_failed", {
          parent: { subscription_details: { subscription: "sub_1" } },
        });

        const [update] = mock.queries;
        expect(update.calls.set[0]).toEqual({ status: "halted" });
        expect(renderSql(update.calls.where[0]).params).toEqual(["sub_1"]);
      });

      it("ignores invoices that are not tied to a subscription", async () => {
        await webhook("invoice.payment_failed", {});

        expect(mock.queries).toHaveLength(0);
      });
    });

    describe("customer.subscription.deleted", () => {
      it("marks the subscription cancelled and moves the user back to the Free plan", async () => {
        mock.enqueue([], [{ id: "plan-free" }], []);

        await webhook("customer.subscription.deleted", { id: "sub_1" });

        const [cancel, freeLookup, downgrade] = mock.queries;
        expect(cancel.calls.set[0]).toEqual({ status: "cancelled" });
        expect(renderSql(cancel.calls.where[0]).params).toEqual(["sub_1"]);
        expect(renderSql(freeLookup.calls.where[0]).params).toEqual(["Free"]);
        expect(downgrade.calls.set[0]).toEqual({ planId: "plan-free" });
        expect(renderSql(downgrade.calls.where[0]).params).toEqual(["sub_1"]);
      });

      it("only cancels when there is no Free plan to fall back to", async () => {
        mock.enqueue([], [], []);

        await webhook("customer.subscription.deleted", { id: "sub_1" });

        expect(mock.queries.filter((q) => q.kind === "update")).toHaveLength(1);
      });
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  describe("cancelSubscription", () => {
    it("schedules cancellation at period end by default and keeps the subscription active", async () => {
      mock.enqueue(
        [{ stripeSubscriptionId: "sub_1" }],
        [{ status: "active", cancelAtPeriodEnd: true }],
      );

      const result = await service.cancelSubscription("u1");

      expect(stripe.subscriptions.update).toHaveBeenCalledWith("sub_1", {
        cancel_at_period_end: true,
      });
      expect(stripe.subscriptions.cancel).not.toHaveBeenCalled();
      expect(mock.queries[1].calls.set[0]).toMatchObject({
        cancelAtPeriodEnd: true,
        status: "active",
      });
      expect(result).toEqual({ status: "active", cancelAtPeriodEnd: true });
    });

    it("cancels immediately in Stripe when requested", async () => {
      mock.enqueue([{ stripeSubscriptionId: "sub_1" }], [{ cancelAtPeriodEnd: false }]);

      await service.cancelSubscription("u1", true);

      expect(stripe.subscriptions.cancel).toHaveBeenCalledWith("sub_1");
      expect(stripe.subscriptions.update).not.toHaveBeenCalled();
      expect(mock.queries[1].calls.set[0]).toMatchObject({ cancelAtPeriodEnd: false });
    });

    it("throws NotFoundException and does not call Stripe when there is no Stripe subscription id", async () => {
      mock.enqueue([{ stripeSubscriptionId: null }]);

      await expect(service.cancelSubscription("u1")).rejects.toThrow(
        new NotFoundException("No active subscription"),
      );
      expect(stripe.subscriptions.update).not.toHaveBeenCalled();
      expect(stripe.subscriptions.cancel).not.toHaveBeenCalled();
    });

    it("leaves the database untouched when Stripe rejects the cancellation", async () => {
      mock.enqueue([{ stripeSubscriptionId: "sub_1" }]);
      stripe.subscriptions.update.mockRejectedValue(new Error("stripe error"));

      await expect(service.cancelSubscription("u1")).rejects.toThrow("stripe error");
      expect(mock.queries).toHaveLength(1);
    });
  });

  describe("resumeSubscription", () => {
    it("turns off cancel-at-period-end in Stripe and in the database", async () => {
      mock.enqueue([{ stripeSubscriptionId: "sub_1" }], [{ cancelAtPeriodEnd: false }]);

      const result = await service.resumeSubscription("u1");

      expect(stripe.subscriptions.update).toHaveBeenCalledWith("sub_1", {
        cancel_at_period_end: false,
      });
      expect(mock.queries[1].calls.set[0]).toMatchObject({ cancelAtPeriodEnd: false });
      expect(result).toEqual({ cancelAtPeriodEnd: false });
    });

    it.each([
      ["no subscription row", []],
      ["a row without a Stripe subscription id", [{ stripeSubscriptionId: null }]],
    ])("throws NotFoundException for %s", async (_label, rows) => {
      mock.enqueue(rows);

      await expect(service.resumeSubscription("u1")).rejects.toThrow(
        new NotFoundException("No subscription for this user"),
      );
      expect(stripe.subscriptions.update).not.toHaveBeenCalled();
    });
  });

  describe("getCurrentSubscription", () => {
    it("returns the subscription joined with its plan", async () => {
      const row = { plan_name: "Pro", status: "active" };
      mock.enqueue([row]);

      await expect(service.getCurrentSubscription("u1")).resolves.toEqual(row);
    });

    it("returns null when the user has no subscription", async () => {
      mock.enqueue([]);

      await expect(service.getCurrentSubscription("u1")).resolves.toBeNull();
    });
  });

  describe("listInvoices", () => {
    it("lists up to 100 invoices of the Stripe customer in a simplified shape", async () => {
      mock.enqueue([{ stripeCustomerId: "cus_1" }]);
      stripe.invoices.list.mockResolvedValue({
        data: [
          {
            id: "in_1",
            amount_paid: 29900,
            currency: "thb",
            status: "paid",
            created: 1_800_000_000,
            hosted_invoice_url: "https://invoice.stripe.test/in_1",
            customer_email: "must-not-leak@example.com",
          },
        ],
      });

      const result = await service.listInvoices("u1");

      expect(stripe.invoices.list).toHaveBeenCalledWith({ customer: "cus_1", limit: 100 });
      expect(result).toEqual([
        {
          id: "in_1",
          amountPaid: 29900,
          currency: "thb",
          status: "paid",
          createdAt: new Date(1_800_000_000 * 1000),
          hostedInvoiceUrl: "https://invoice.stripe.test/in_1",
        },
      ]);
    });

    it("returns an empty list when the customer has no invoices", async () => {
      mock.enqueue([{ stripeCustomerId: "cus_1" }]);
      stripe.invoices.list.mockResolvedValue({ data: [] });

      await expect(service.listInvoices("u1")).resolves.toEqual([]);
    });

    it.each([
      ["no subscription row", []],
      ["no Stripe customer", [{ stripeCustomerId: null }]],
    ])("throws BadRequestException when the user has %s", async (_label, rows) => {
      mock.enqueue(rows);

      await expect(service.listInvoices("u1")).rejects.toThrow(
        new BadRequestException("No billing account for this user"),
      );
      expect(stripe.invoices.list).not.toHaveBeenCalled();
    });
  });

  describe("portalSubscription", () => {
    beforeEach(() => {
      vi.spyOn(console, "log").mockImplementation(() => undefined);
    });

    it("returns a billing portal url that sends the user back to the subscription settings", async () => {
      mock.enqueue([{ stripeCustomerId: "cus_1" }]);
      stripe.billingPortal.sessions.create.mockResolvedValue({
        url: "https://portal.stripe.test/s",
      });

      const result = await service.portalSubscription("u1");

      expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: "cus_1",
        return_url: "https://app.example.com/settings/subscription",
      });
      expect(result).toEqual({ url: "https://portal.stripe.test/s" });
    });

    it("throws BadRequestException when the user has no Stripe customer", async () => {
      mock.enqueue([{ stripeCustomerId: null }]);

      await expect(service.portalSubscription("u1")).rejects.toThrow(BadRequestException);
      expect(stripe.billingPortal.sessions.create).not.toHaveBeenCalled();
    });
  });
});
