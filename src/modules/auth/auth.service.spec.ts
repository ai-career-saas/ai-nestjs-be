import * as bcrypt from "bcrypt";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockDb, renderSql } from "../../utils/test/mockdb";
import { JwtService } from "@nestjs/jwt";
import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import type { Response } from "express";

vi.mock("bcrypt", () => ({ hash: vi.fn(), compare: vi.fn() }));

const hash = bcrypt.hash as unknown as ReturnType<typeof vi.fn>;
const compare = bcrypt.compare as unknown as ReturnType<typeof vi.fn>;

const createdUser = {
  id: "u1",
  email: "nam@example.com",
  name: "Nam",
  createdAt: new Date("2026-01-01T00:00:00Z"),
};

describe("AuthService", () => {
  let mock: ReturnType<typeof createMockDb>;
  let jwt: { sign: ReturnType<typeof vi.fn>; verify: ReturnType<typeof vi.fn> };
  let authService: AuthService;

  beforeEach(() => {
    vi.stubEnv("JWT_SECRET", "access-secret");
    vi.stubEnv("JWT_REFRESH_SECRET", "refresh-secret");

    mock = createMockDb();

    jwt = {
      sign: vi.fn(
        (payload: { sub: string }, opts: { secret: string; expiresIn: string }) =>
          `${opts.secret}|${opts.expiresIn}|${payload.sub}`,
      ),
      verify: vi.fn(),
    };
    hash.mockResolvedValue("hashed-password");
    authService = new AuthService(mock.db, jwt as unknown as JwtService);
  });

  describe("register", () => {
    const dto = { email: "Nam@Example.COM", name: "Nam", password: "password123" };

    it("creates the user with a lower-cased email and a bcrypt hash (never the raw password)", async () => {
      mock.enqueue([], [createdUser], [{ id: "plan-free" }], []);

      await authService.register(dto);

      expect(hash).toHaveBeenCalledWith("password123", 12);
      const [lookup, insertUser] = mock.queries;
      expect(renderSql(lookup.calls.where[0]).params).toEqual(["nam@example.com"]);
      expect(insertUser.calls.values[0]).toEqual({
        email: "nam@example.com",
        name: "Nam",
        passwordHash: "hashed-password",
      });
    });

    it("returns the public user fields plus access and refresh tokens", async () => {
      mock.enqueue([], [createdUser], [{ id: "plan-free" }], []);

      const result = await authService.register(dto);

      expect(result).toEqual({
        user: { id: "u1", email: "nam@example.com", name: "Nam" },
        access_token: "access-secret|1h|u1",
        refresh_token: "refresh-secret|7d|u1",
      });
      expect(JSON.stringify(result)).not.toContain("hashed-password");
    });

    it("subscribes the new user to the Free plan", async () => {
      mock.enqueue([], [createdUser], [{ id: "plan-free" }], []);

      await authService.register(dto);

      const subscriptionInsert = mock.queries[3];
      expect(subscriptionInsert.kind).toBe("insert");
      expect(subscriptionInsert.calls.values[0]).toEqual({
        userId: "u1",
        planId: "plan-free",
        status: "active",
      });
      expect(subscriptionInsert.calls.onConflictDoNothing).toBeDefined();
    });

    it("still registers the user when no Free plan exists, without creating a subscription", async () => {
      mock.enqueue([], [createdUser], []);

      const result = await authService.register(dto);

      expect(result.user.id).toBe("u1");
      expect(mock.queries).toHaveLength(3);
    });

    it("rejects an already registered email with ConflictException and writes nothing", async () => {
      mock.enqueue([{ id: "existing" }]);

      await expect(authService.register(dto)).rejects.toThrow(
        new ConflictException("Email already registered"),
      );
      expect(hash).not.toHaveBeenCalled();
      expect(mock.queries).toHaveLength(1);
    });
  });

  describe("login", () => {
    const dto = { email: "Nam@Example.com", password: "password123" };
    const dbUser = { id: "u1", email: "nam@example.com", name: "Nam", passwordHash: "stored-hash" };
    let res: { cookie: ReturnType<typeof vi.fn> };

    beforeEach(() => {
      res = { cookie: vi.fn() };
    });

    it("looks the user up by lower-cased email", async () => {
      mock.enqueue([dbUser]);
      compare.mockResolvedValue(true);

      await authService.login(dto, res as unknown as Response);

      expect(renderSql(mock.queries[0].calls.where[0]).params).toEqual(["nam@example.com"]);
    });

    it("returns tokens and the public user without the password hash on valid credentials", async () => {
      mock.enqueue([dbUser]);
      compare.mockResolvedValue(true);

      const result = await authService.login(dto, res as unknown as Response);

      expect(compare).toHaveBeenCalledWith("password123", "stored-hash");
      expect(result).toEqual({
        user: { id: "u1", email: "nam@example.com", name: "Nam" },
        access_token: "access-secret|1h|u1",
        refresh_token: "refresh-secret|7d|u1",
      });
    });

    it("sets httpOnly access and refresh cookies with matching lifetimes", async () => {
      mock.enqueue([dbUser]);
      compare.mockResolvedValue(true);

      await authService.login(dto, res as unknown as Response);

      expect(res.cookie).toHaveBeenCalledTimes(2);
      expect(res.cookie).toHaveBeenCalledWith(
        "access_token",
        "access-secret|1h|u1",
        expect.objectContaining({
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: 15 * 60 * 1000,
        }),
      );
      expect(res.cookie).toHaveBeenCalledWith(
        "refresh_token",
        "refresh-secret|7d|u1",
        expect.objectContaining({
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        }),
      );
    });

    it.each([
      ["production", true],
      ["development", false],
    ])("sets the cookie secure flag for NODE_ENV=%s to %s", async (env, secure) => {
      vi.stubEnv("NODE_ENV", env);
      mock.enqueue([dbUser]);
      compare.mockResolvedValue(true);

      await authService.login(dto, res as unknown as Response);

      for (const call of res.cookie.mock.calls) {
        expect(call[2].secure).toBe(secure);
      }
    });

    it("rejects an unknown email without checking any password", async () => {
      mock.enqueue([]);

      await expect(authService.login(dto, res as unknown as Response)).rejects.toThrow(
        new UnauthorizedException("Invalid credentials"),
      );
      expect(compare).not.toHaveBeenCalled();
      expect(res.cookie).not.toHaveBeenCalled();
    });

    it("rejects a wrong password with the same message as an unknown email", async () => {
      mock.enqueue([dbUser]);
      compare.mockResolvedValue(false);

      await expect(authService.login(dto, res as unknown as Response)).rejects.toThrow(
        new UnauthorizedException("Invalid credentials"),
      );
      expect(res.cookie).not.toHaveBeenCalled();
    });
  });

  describe("refresh", () => {
    it("verifies the token with the refresh secret and issues a new token pair", async () => {
      jwt.verify.mockReturnValue({ sub: "u1" });
      mock.enqueue([{ id: "u1", email: "nam@example.com", name: "Nam" }]);

      const tokens = await authService.refresh("old-refresh");

      expect(jwt.verify).toHaveBeenCalledWith("old-refresh", { secret: "refresh-secret" });
      expect(tokens).toEqual({
        access_token: "access-secret|1h|u1",
        refresh_token: "refresh-secret|7d|u1",
      });
    });

    it("rejects a token that fails verification (expired or tampered)", async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error("jwt expired");
      });

      await expect(authService.refresh("bad")).rejects.toThrow(
        new UnauthorizedException("Invalid refresh token"),
      );
      expect(mock.queries).toHaveLength(0);
    });

    it("rejects a valid token whose user no longer exists", async () => {
      jwt.verify.mockReturnValue({ sub: "deleted-user" });
      mock.enqueue([]);

      await expect(authService.refresh("valid-but-orphaned")).rejects.toThrow(
        new UnauthorizedException("Invalid refresh token"),
      );
    });
  });

  describe("getProfile", () => {
    it("returns the profile with plan and subscription details", async () => {
      const profile = {
        id: "u1",
        email: "nam@example.com",
        plan_name: "Free",
        sub_status: "active",
      };
      mock.enqueue([profile]);

      await expect(authService.getProfile("u1")).resolves.toEqual(profile);
      expect(renderSql(mock.queries[0].calls.where[0]).params).toEqual(["u1"]);
    });

    it("throws UnauthorizedException when the user no longer exists", async () => {
      mock.enqueue([]);

      await expect(authService.getProfile("gone")).rejects.toThrow(UnauthorizedException);
    });
  });
});
