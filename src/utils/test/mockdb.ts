import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { DrizzleDB } from "../../database.module";

export interface RecordedQuery {
  kind: "select" | "insert" | "update" | "delete";
  calls: Record<string, unknown[]>;
}

export function createMockDb() {
  const queue: unknown[] = [];
  const queries: RecordedQuery[] = [];

  const start =
    (kind: RecordedQuery["kind"]) =>
    (...args: unknown[]) => {
      const query: RecordedQuery = { kind, calls: { [kind]: args } };
      queries.push(query);

      const chain: any = new Proxy(
        {},
        {
          get(_target, prop: string) {
            if (prop === "then") {
              return (resolve: (v: unknown) => void, reject: (e: unknown) => void) => {
                const next = queue.length ? queue.shift() : [];
                return next instanceof Error ? reject(next) : resolve(next);
              };
            }
            return (...callArgs: unknown[]) => {
              query.calls[prop] = callArgs;
              return chain;
            };
          },
        },
      );
      return chain;
    };

  const db = {
    select: start("select"),
    insert: start("insert"),
    update: start("update"),
    delete: start("delete"),
  } as unknown as DrizzleDB;

  return {
    db,
    queries,
    /** Queue the results for the next awaited queries, in order. */
    enqueue: (...results: unknown[]) => void queue.push(...results),
  };
}

const dialect = new PgDialect();

/** Renders a Drizzle condition (e.g. the argument of `.where()`) to SQL text and bound params. */
export function renderSql(condition: unknown) {
  return dialect.sqlToQuery(condition as SQL);
}
