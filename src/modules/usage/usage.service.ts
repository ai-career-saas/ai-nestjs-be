import { Injectable, Inject } from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import { DRIZZLE, DrizzleDB } from "src/database.module";
import { usageLogs, plans, subscriptions } from "src/database/schema";

@Injectable()
export class UsageService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  private currentPeriod(): string {
    const period = new Date();
    period.setDate(1);
    return period.toISOString().split('T')[0];
  }

  async getUsageForUser(userId: string, feature: string) {
    const periodStr = this.currentPeriod();

    const [usage] = await this.db
      .select({ count: usageLogs.count })
      .from(usageLogs)
      .where(
        and(
          eq(usageLogs.userId, userId),
          eq(usageLogs.feature, feature),
          eq(usageLogs.period, periodStr),
        ),
      )
      .limit(1);
    const used = usage?.count || 0;

    const [planRow] = await this.db
      .select({ quota: plans.quota })
      .from(plans)
      .innerJoin(subscriptions, eq(subscriptions.planId, plans.id))
      .where(
        and(eq(subscriptions.userId, userId), eq(subscriptions.status, 'active')),
      )
      .limit(1);
    const quota = (planRow?.quota as Record<string, number>) || {};
    const limit = quota[feature] ?? 5;

    return { used, limit, remaining: Math.max(0, limit - used) };
  }

  async incrementUsage(userId: string, feature: string): Promise<void> {
    const periodStr = this.currentPeriod();

    await this.db
      .insert(usageLogs)
      .values({ userId, feature, period: periodStr, count: 1 })
      .onConflictDoUpdate({
        target: [usageLogs.userId, usageLogs.feature, usageLogs.period],
        set: { count: sql`${usageLogs.count} + 1` },
      });
  }

  async getAllUsage(userId: string) {
    const periodStr = this.currentPeriod();

    return this.db
      .select({ feature: usageLogs.feature, count: usageLogs.count })
      .from(usageLogs)
      .where(
        and(eq(usageLogs.userId, userId), eq(usageLogs.period, periodStr)),
      );
  }
}