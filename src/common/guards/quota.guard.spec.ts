import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Feature } from "../decorators/feature.decorator";
import { UsageService } from "../../modules/usage/usage.service";
import { QuotaGuard } from "./quota.guard";

class FakeController {
  @Feature("analyze")
  limited() {}

  unlimited() {}
}

function contextFor(handler: () => void, user?: { userId?: string }) {
  return {
    getHandler: () => handler,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe("QuotaGuard", () => {
  let usage: {
    getUsageForUser: ReturnType<typeof vi.fn>;
    incrementUsage: ReturnType<typeof vi.fn>;
  };
  let guard: QuotaGuard;

  beforeEach(() => {
    usage = { getUsageForUser: vi.fn(), incrementUsage: vi.fn() };
    guard = new QuotaGuard(new Reflector(), usage as unknown as UsageService);
  });

  it("lets requests through without touching usage when the handler has no @Feature", async () => {
    const ctx = contextFor(FakeController.prototype.unlimited, { userId: "u1" });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(usage.getUsageForUser).not.toHaveBeenCalled();
    expect(usage.incrementUsage).not.toHaveBeenCalled();
  });

  it("denies access when the request has no authenticated user id", async () => {
    const ctx = contextFor(FakeController.prototype.limited, {});

    await expect(guard.canActivate(ctx)).resolves.toBe(false);
    expect(usage.incrementUsage).not.toHaveBeenCalled();
  });

  it("denies access when there is no user on the request at all", async () => {
    const ctx = contextFor(FakeController.prototype.limited, undefined);

    await expect(guard.canActivate(ctx)).resolves.toBe(false);
  });

  it("allows the request and records one usage when the user is under quota", async () => {
    usage.getUsageForUser.mockResolvedValue({ used: 2, limit: 5, remaining: 3 });
    const ctx = contextFor(FakeController.prototype.limited, { userId: "u1" });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(usage.getUsageForUser).toHaveBeenCalledWith("u1", "analyze");
    expect(usage.incrementUsage).toHaveBeenCalledWith("u1", "analyze");
  });

  it("allows the last remaining request (used = limit - 1)", async () => {
    usage.getUsageForUser.mockResolvedValue({ used: 4, limit: 5, remaining: 1 });

    await expect(
      guard.canActivate(contextFor(FakeController.prototype.limited, { userId: "u1" })),
    ).resolves.toBe(true);
    expect(usage.incrementUsage).toHaveBeenCalledTimes(1);
  });

  it("rejects with ForbiddenException once the quota is exactly used up", async () => {
    usage.getUsageForUser.mockResolvedValue({ used: 5, limit: 5, remaining: 0 });
    const ctx = contextFor(FakeController.prototype.limited, { userId: "u1" });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      "Monthly quota exceeded for analyze (5/5). Please upgrade your plan.",
    );
    expect(usage.incrementUsage).not.toHaveBeenCalled();
  });

  it("rejects when usage is above the limit (e.g. after a plan downgrade)", async () => {
    usage.getUsageForUser.mockResolvedValue({ used: 9, limit: 5, remaining: 0 });

    await expect(
      guard.canActivate(contextFor(FakeController.prototype.limited, { userId: "u1" })),
    ).rejects.toThrow(/9\/5/);
  });
});
