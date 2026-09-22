import { describe, expect, it, vi } from 'vitest';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';

describe('PlansController.findAll', () => {
  it('returns the plans provided by the service', async () => {
    const plans = [{ name: 'Free' }, { name: 'Pro' }];
    const service = { findAllPlans: vi.fn().mockResolvedValue(plans) };
    const controller = new PlansController(service as unknown as PlansService);

    await expect(controller.findAll()).resolves.toEqual(plans);
    expect(service.findAllPlans).toHaveBeenCalledTimes(1);
  });
});
