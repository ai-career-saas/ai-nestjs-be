import { Global, Module } from "@nestjs/common";
import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./database/schema";

export const DRIZZLE = "DRIZZLE";

export type DrizzleDB = NodePgDatabase<typeof schema>;

const dbProvider = {
  provide: DRIZZLE,
  useFactory: (): DrizzleDB => {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: process.env.NODE_ENV === "production" ? true : false,
      },
    });

    return drizzle(pool, { schema });
  },
};

@Global()
@Module({
  providers: [dbProvider],
  exports: [dbProvider],
})
export class DatabaseModule {}
