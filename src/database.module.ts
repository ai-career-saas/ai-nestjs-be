import { Global, Injectable, Module, OnModuleDestroy, Inject } from "@nestjs/common";
import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./database/schema";

export const DRIZZLE = "DRIZZLE";
export const PG_POOL = "PG_POOL";

export type DrizzleDB = NodePgDatabase<typeof schema>;

const poolProvider = {
  provide: PG_POOL,
  useFactory: (): Pool =>
    new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: process.env.NODE_ENV === "production" ? true : false,
      },
      max: Number(process.env.DB_POOL_MAX) || 10,
    }),
};

const dbProvider = {
  provide: DRIZZLE,
  useFactory: (pool: Pool): DrizzleDB => drizzle(pool, { schema }),
  inject: [PG_POOL],
};

@Injectable()
class PoolShutdown implements OnModuleDestroy {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}

@Global()
@Module({
  providers: [poolProvider, dbProvider, PoolShutdown],
  exports: [dbProvider],
})
export class DatabaseModule {}
