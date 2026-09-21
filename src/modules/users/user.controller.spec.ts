import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UsageService } from '../usage/usage.service';
import { UserService } from './user.service';
import { UsersController } from './user.controller';

describe('UsersController.getUsage', () => {
  let usage: { getUsageForUser: ReturnType<typeof vi.fn> };
  let controller: UsersController;

  beforeEach(() => {
    usage = { getUsageForUser: vi.fn() };
    controller = new UsersController(usage as unknown as UsageService, {} as UserService);
  });

  it('returns the usage of every metered feature keyed by feature name', async () => {
    usage.getUsageForUser.mockImplementation(async (_userId: string, feature: string) => ({
      used: feature.length,
      limit: 10,
      remaining: 10 - feature.length,
    }));

    const result = await controller.getUsage({ user: { userId: 'u1' } });

    expect(Object.keys(result)).toEqual(['analyze', 'interview_gen', 'ats_score']);
    expect(result.analyze).toEqual({ used: 7, limit: 10, remaining: 3 });
    for (const feature of ['analyze', 'interview_gen', 'ats_score']) {
      expect(usage.getUsageForUser).toHaveBeenCalledWith('u1', feature);
    }
  });

  it('propagates errors from the usage service', async () => {
    usage.getUsageForUser.mockRejectedValue(new Error('db down'));

    await expect(controller.getUsage({ user: { userId: 'u1' } })).rejects.toThrow('db down');
  });
});

describe('UsersController profile endpoints', () => {
  const user = { userId: 'u1', email: 'a@b.co', name: 'Nam' };
  let userService: { getProfile: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  let controller: UsersController;

  beforeEach(() => {
    userService = { getProfile: vi.fn(), update: vi.fn() };
    controller = new UsersController({} as UsageService, userService as unknown as UserService);
  });

  it('getProfile loads the profile of the authenticated user', async () => {
    userService.getProfile.mockResolvedValue({ name: 'Nam' });

    await expect(controller.getProfile(user)).resolves.toEqual({ name: 'Nam' });
    expect(userService.getProfile).toHaveBeenCalledWith('u1');
  });

  it('updateProfile applies the DTO to the authenticated user only', async () => {
    userService.update.mockResolvedValue({ locale: 'en' });

    await expect(controller.updateProfile(user, { locale: 'en' })).resolves.toEqual({ locale: 'en' });
    expect(userService.update).toHaveBeenCalledWith('u1', { locale: 'en' });
  });
});
