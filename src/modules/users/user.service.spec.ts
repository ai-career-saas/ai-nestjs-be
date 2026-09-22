import { NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it } from "vitest";
import { createMockDb, renderSql } from "../../utils/test/mockdb";
import { UserService } from "./user.service";

const profile = {
  name: "Nam",
  email: "nam@example.com",
  locale: "th",
  timezone: "Asia/Bangkok",
  notifyEmail: true,
  notifyProduct: false,
  notifyUsageAlerts: true,
};

describe("UserService", () => {
  let mock: ReturnType<typeof createMockDb>;
  let service: UserService;

  beforeEach(() => {
    mock = createMockDb();
    service = new UserService(mock.db);
  });

  describe("getProfile", () => {
    it("returns the settings profile of the user", async () => {
      mock.enqueue([profile]);

      await expect(service.getProfile("u1")).resolves.toEqual(profile);
      expect(renderSql(mock.queries[0].calls.where[0]).params).toEqual(["u1"]);
    });

    it("never selects the password hash", async () => {
      mock.enqueue([profile]);

      await service.getProfile("u1");

      const selected = Object.keys(mock.queries[0].calls.select[0] as object);
      expect(selected).not.toContain("passwordHash");
      expect(selected.sort()).toEqual(Object.keys(profile).sort());
    });

    it("throws NotFoundException when the user does not exist", async () => {
      mock.enqueue([]);

      await expect(service.getProfile("missing")).rejects.toThrow(NotFoundException);
    });
  });

  describe("update", () => {
    it("applies the provided fields and bumps updatedAt", async () => {
      mock.enqueue([{ ...profile, locale: "en" }]);

      const result = await service.update("u1", { locale: "en" });

      expect(result.locale).toBe("en");
      const set = mock.queries[0].calls.set[0] as Record<string, unknown>;
      expect(set.locale).toBe("en");
      expect(set.updatedAt).toBeInstanceOf(Date);
    });

    it("does not write fields that were not provided", async () => {
      mock.enqueue([profile]);

      await service.update("u1", { name: "New Name" });

      const set = mock.queries[0].calls.set[0] as Record<string, unknown>;
      expect(Object.keys(set).sort()).toEqual(["name", "updatedAt"]);
    });

    it("only updates the requesting user and returns settings columns without the password hash", async () => {
      mock.enqueue([profile]);

      await service.update("u1", { timezone: "UTC" });

      const [query] = mock.queries;
      expect(renderSql(query.calls.where[0]).params).toEqual(["u1"]);
      expect(Object.keys(query.calls.returning[0] as object)).not.toContain("passwordHash");
    });

    it("throws NotFoundException when no row was updated", async () => {
      mock.enqueue([]);

      await expect(service.update("missing", { name: "x" })).rejects.toThrow(
        new NotFoundException("User not found"),
      );
    });
  });
});
