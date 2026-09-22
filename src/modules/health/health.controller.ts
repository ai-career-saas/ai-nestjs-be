import { Controller, Get, Inject } from "@nestjs/common";
import { HealthCheck, HealthCheckService, HealthIndicatorService } from "@nestjs/terminus";
import { SkipThrottle } from "@nestjs/throttler";
import { sql } from "drizzle-orm";
import { DRIZZLE, DrizzleDB } from "../../database.module";

@SkipThrottle()
@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly healthIndicator: HealthIndicatorService,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () =>
        this.healthIndicator
          .check("database")
          .attempt(async () => {
            await this.db.execute(sql`select 1`);
          })
          .withTimeout(3000),
    ]);
  }
}
