import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';

describe('BillingController.webhook', () => {
  let billing: { handleWebhook: ReturnType<typeof vi.fn> };
  let controller: BillingController;

  beforeEach(() => {
    billing = { handleWebhook: vi.fn().mockResolvedValue({ status: 'ok' }) };
    controller = new BillingController(billing as unknown as BillingService);
  });

  it('verifies the exact raw request body, which is what Stripe signed', async () => {
    const rawBody = Buffer.from('{"id":"evt_1",  "spaced": true}');

    const result = await controller.webhook('sig_1', { rawBody, body: { id: 'evt_1' } } as any);

    expect(billing.handleWebhook).toHaveBeenCalledWith('{"id":"evt_1",  "spaced": true}', 'sig_1');
    expect(result).toEqual({ status: 'ok' });
  });

  it('falls back to the re-serialised parsed body when no raw body is available', async () => {
    await controller.webhook('sig_1', { body: { id: 'evt_1' } } as any);

    expect(billing.handleWebhook).toHaveBeenCalledWith('{"id":"evt_1"}', 'sig_1');
  });

  it('propagates verification errors from the service', async () => {
    billing.handleWebhook.mockRejectedValue(new Error('Invalid webhook signature'));

    await expect(controller.webhook('bad', { rawBody: Buffer.from('{}') } as any)).rejects.toThrow(
      'Invalid webhook signature',
    );
  });
});

describe('BillingController user-scoped endpoints', () => {
  const user = { userId: 'u1', email: 'a@b.co', name: 'Nam' };
  let billing: Record<string, ReturnType<typeof vi.fn>>;
  let controller: BillingController;

  beforeEach(() => {
    billing = {
      createSubscription: vi.fn().mockResolvedValue({ checkoutUrl: 'x' }),
      getCurrentSubscription: vi.fn().mockResolvedValue({ plan_name: 'Pro' }),
      resumeSubscription: vi.fn().mockResolvedValue({ cancelAtPeriodEnd: false }),
      listInvoices: vi.fn().mockResolvedValue([]),
      portalSubscription: vi.fn().mockResolvedValue({ url: 'u' }),
    };
    controller = new BillingController(billing as unknown as BillingService);
  });

  it('subscribe creates a subscription for the authenticated user and requested plan', async () => {
    await expect(controller.subscribe({ planId: 'plan-pro' }, { user })).resolves.toEqual({ checkoutUrl: 'x' });
    expect(billing.createSubscription).toHaveBeenCalledWith('u1', 'plan-pro');
  });

  it.each([
    ['getSubscription', 'getCurrentSubscription'],
    ['resumeSubscription', 'resumeSubscription'],
    ['listInvoices', 'listInvoices'],
    ['portalSubscription', 'portalSubscription'],
  ])('%s calls the service with the authenticated user id', async (method, serviceMethod) => {
    const arg = method === 'getSubscription' ? { user } : user;

    await (controller as any)[method](arg);

    expect(billing[serviceMethod]).toHaveBeenCalledWith('u1');
  });
});
