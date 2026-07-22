import { Injectable, Inject } from "@nestjs/common";
import { asc } from "drizzle-orm";
import { DRIZZLE, DrizzleDB } from "src/database.module";
import { plans } from "src/database/schema";

@Injectable()
export class PlansService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async findAllPlans() {
    return this.db
      .select({
        id: plans.id,
        name: plans.name,
        price_thb: plans.priceThb,
        description: plans.description,
        stripe_price_id: plans.stripePriceId,
        quota: plans.quota,
        features: plans.features,
      })
      .from(plans)
      .orderBy(asc(plans.priceThb));
  }
}
