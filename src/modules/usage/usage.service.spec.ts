import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockDb, renderSql } from "../../utils/test/mockdb";
import { UsageService } from "./usage.service";

describe("UsageService", () => {
  let mock: ReturnType<typeof createMockDb>;
  let service: UsageService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T12:00:00Z"));
    mock = createMockDb();
    service = new UsageService(mock.db);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("getUsageForUser", () => {
    it("returns used count, plan limit and remaining quota", async () => {
      mock.enqueue([{ count: 3 }], [{ quota: { analyze: 10, interview_gen: 5 } }]);

      const result = await service.getUsageForUser("u1", "analyze");

      expect(result).toEqual({ used: 3, limit: 10, remaining: 7 });
    });

    it("treats a missing usage row as zero usage", async () => {
      mock.enqueue([], [{ quota: { analyze: 10 } }]);

      const result = await service.getUsageForUser("u1", "analyze");

      expect(result).toEqual({ used: 0, limit: 10, remaining: 10 });
    });

    it("falls back to the default limit of 5 when the user has no plan", async () => {
      mock.enqueue([{ count: 1 }], []);

      const result = await service.getUsageForUser("u1", "analyze");

      expect(result).toEqual({ used: 1, limit: 5, remaining: 4 });
    });

    it("falls back to the default limit when the plan does not define the feature", async () => {
      mock.enqueue([{ count: 0 }], [{ quota: { analyze: 10 } }]);

      const result = await service.getUsageForUser("u1", "ats_score");

      expect(result.limit).toBe(5);
    });

    it("never reports negative remaining quota when usage exceeds the limit", async () => {
      mock.enqueue([{ count: 12 }], [{ quota: { analyze: 10 } }]);

      const result = await service.getUsageForUser("u1", "analyze");

      expect(result).toEqual({ used: 12, limit: 10, remaining: 0 });
    });

    it("scopes the usage lookup to the user, feature and the first day of the current month", async () => {
      mock.enqueue([{ count: 0 }], []);

      await service.getUsageForUser("u1", "analyze");

      const [usageQuery, planQuery] = mock.queries;
      expect(renderSql(usageQuery.calls.where[0]).params).toEqual(["u1", "analyze", "2026-03-01"]);
      expect(renderSql(planQuery.calls.where[0]).params).toEqual(["u1"]);
    });

    it("uses the period of the current month at the end of a month", async () => {
      vi.setSystemTime(new Date("2026-03-31T12:00:00Z"));
      mock.enqueue([], []);

      await service.getUsageForUser("u1", "analyze");

      expect(renderSql(mock.queries[0].calls.where[0]).params).toContain("2026-03-01");
    });
  });

  describe("incrementUsage", () => {
    it("inserts a first-time usage row with count 1 for the current period", async () => {
      await service.incrementUsage("u1", "analyze");

      const [query] = mock.queries;
      expect(query.kind).toBe("insert");
      expect(query.calls.values[0]).toEqual({
        userId: "u1",
        feature: "analyze",
        period: "2026-03-01",
        count: 1,
      });
    });

    it("upserts on (user, feature, period) so repeated calls increment instead of duplicating", async () => {
      await service.incrementUsage("u1", "analyze");

      const [config] = mock.queries[0].calls.onConflictDoUpdate as [
        { target: unknown[]; set: object },
      ];
      expect(config.target).toHaveLength(3);
      expect(Object.keys(config.set)).toEqual(["count"]);
    });
  });

  describe("getAllUsage", () => {
    it("returns the user's per-feature usage for the current period", async () => {
      const rows = [
        { feature: "analyze", count: 2 },
        { feature: "interview_gen", count: 1 },
      ];
      mock.enqueue(rows);

      await expect(service.getAllUsage("u1")).resolves.toEqual(rows);
      expect(renderSql(mock.queries[0].calls.where[0]).params).toEqual(["u1", "2026-03-01"]);
    });
  });
});
