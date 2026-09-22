import { beforeEach, describe, expect, it, vi } from "vitest";
import { Response } from "express";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

describe("AuthController", () => {
  let auth: Record<"register" | "login" | "refresh" | "getProfile", ReturnType<typeof vi.fn>>;
  let controller: AuthController;

  beforeEach(() => {
    auth = { register: vi.fn(), login: vi.fn(), refresh: vi.fn(), getProfile: vi.fn() };
    controller = new AuthController(auth as unknown as AuthService);
  });

  it("register delegates the DTO to the service", async () => {
    const dto = { email: "a@b.co", name: "Nam", password: "password123" };
    auth.register.mockResolvedValue({ ok: 1 });

    await expect(controller.register(dto)).resolves.toEqual({ ok: 1 });
    expect(auth.register).toHaveBeenCalledWith(dto);
  });

  it("login passes the response object through so the service can set cookies", async () => {
    const dto = { email: "a@b.co", password: "x" };
    const res = {} as Response;
    auth.login.mockResolvedValue({ ok: 2 });

    await expect(controller.login(dto, res)).resolves.toEqual({ ok: 2 });
    expect(auth.login).toHaveBeenCalledWith(dto, res);
  });

  it("refresh passes only the refresh token string", async () => {
    auth.refresh.mockResolvedValue({ access_token: "a" });

    await controller.refresh({ refresh_token: "r1" });

    expect(auth.refresh).toHaveBeenCalledWith("r1");
  });

  it("me loads the profile of the authenticated user", async () => {
    auth.getProfile.mockResolvedValue({ id: "u1" });

    await expect(controller.me({ user: { userId: "u1" } })).resolves.toEqual({ id: "u1" });
    expect(auth.getProfile).toHaveBeenCalledWith("u1");
  });
});
