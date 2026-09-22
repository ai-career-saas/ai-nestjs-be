import { NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it } from "vitest";
import { createMockDb, renderSql } from "../../utils/test/mockdb";
import { ResultsService } from "./results.service";

describe("ResultsService", () => {
  let mock: ReturnType<typeof createMockDb>;
  let service: ResultsService;

  beforeEach(() => {
    mock = createMockDb();
    service = new ResultsService(mock.db);
  });

  describe("saveResult", () => {
    it("inserts the result for the user and agent type with a fresh updatedAt", async () => {
      const result = { score: 82 };
      const metadata = { model: "x" };

      await service.saveResult("u1", "ats_scorer", result, metadata);

      const [query] = mock.queries;
      expect(query.kind).toBe("insert");
      expect(query.calls.values[0]).toMatchObject({
        userId: "u1",
        agentType: "ats_scorer",
        result,
        metadata,
      });
      expect((query.calls.values[0] as { updatedAt: unknown }).updatedAt).toBeInstanceOf(Date);
    });

    it("upserts on (userId, agentType) so a user keeps one saved result per agent", async () => {
      await service.saveResult("u1", "ats_scorer", { score: 90 });

      const [config] = mock.queries[0].calls.onConflictDoUpdate as [
        { target: unknown[]; set: Record<string, unknown> },
      ];
      expect(config.target).toHaveLength(2);
      expect(config.set).toMatchObject({ result: { score: 90 } });
      expect(config.set.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe("listResults", () => {
    it("returns only the requesting user's saved results", async () => {
      const rows = [{ agentType: "job_matcher" }, { agentType: "ats_scorer" }];
      mock.enqueue(rows);

      await expect(service.listResults("u1")).resolves.toEqual(rows);
      expect(renderSql(mock.queries[0].calls.where[0]).params).toEqual(["u1"]);
    });
  });

  describe("getResult", () => {
    it("returns the saved row for the user and agent type", async () => {
      const row = { agentType: "ats_scorer", result: { score: 70 } };
      mock.enqueue([row]);

      await expect(service.getResult("u1", "ats_scorer")).resolves.toEqual(row);
      expect(renderSql(mock.queries[0].calls.where[0]).params).toEqual(["u1", "ats_scorer"]);
    });

    it("throws NotFoundException naming the agent type when nothing is saved", async () => {
      mock.enqueue([]);

      const call = service.getResult("u1", "job_matcher");

      await expect(call).rejects.toThrow(NotFoundException);
      await expect(call).rejects.toThrow("No saved result for job_matcher");
    });
  });

  describe("deleteResult", () => {
    it("deletes only the row matching the user and agent type", async () => {
      await service.deleteResult("u1", "resume_analysis");

      const [query] = mock.queries;
      expect(query.kind).toBe("delete");
      expect(renderSql(query.calls.where[0]).params).toEqual(["u1", "resume_analysis"]);
    });
  });
});
