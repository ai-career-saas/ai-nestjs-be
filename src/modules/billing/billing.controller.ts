import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BillingService } from './billing.service';
import { ApiBearerAuth, ApiBody } from '@nestjs/swagger';

@Controller('billing')
export class BillingController {
  constructor(private billing: BillingService) {}

  @ApiBearerAuth()
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        planId: { type: 'string' },
      },
    },
    examples: {
      'planId': {
        summary: 'Subscribe to a plan',
        value: {
          planId: '1234567890',
        } as any,
      },
    },
  })
  @UseGuards(JwtAuthGuard)
  @Post('subscribe')
  subscribe(@Body('planId') planId: string, @Req() req: any) {
    return this.billing.createSubscription(req.user.userId, planId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('subscription')
  getSubscription(@Req() req: any) {
    return this.billing.getCurrentSubscription(req.user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('subscription')
  cancelSubscription(@Req() req: any) {
    return this.billing.cancelSubscription(req.user.userId);
  }

  // Stripe calls this — no JWT guard
  @Post('webhook')
  async webhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const rawBody = (req as any).rawBody?.toString() || JSON.stringify((req as any).body);
    return this.billing.handleWebhook(rawBody, signature);
  }
}