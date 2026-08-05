import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { BillingService } from "./billing.service";
import { ApiBearerAuth, ApiBody, ApiResponse } from "@nestjs/swagger";
import { CurrentUser } from "src/common/decorators/currentuser.decorator";
import { CancelSubscriptionDto } from "./dto/request/CancelSubscription.dto";
import { CancelSubscriptionResponse } from "./dto/response/CancelSubscriptionResponse.dto";
import { UserPayload } from "src/common/interfaces/UserPayload.interface";
import { CreateSubscriptionResponse } from "./dto/response/CreateSubscriptionResponse.dto";
import { CreateSubscriptionRequest } from "./dto/request/CreateSubscriptionRequest.dto";
import { GetSubscriptionResponse } from "./dto/response/GetSubscriptionResponse.dto";
import { ResumeSubscriptionResponse } from "./dto/response/ResumeSubscriptionResponse.dto";

@Controller("billing")
export class BillingController {
  constructor(private billingService: BillingService) {}

  @ApiBearerAuth()
  @ApiBody({
    type: CreateSubscriptionRequest,
  })
  @ApiResponse({
    status: 201,
    type: CreateSubscriptionResponse,
  })
  @UseGuards(JwtAuthGuard)
  @Post("subscribe")
  @HttpCode(201)
  subscribe(
    @Body() createSubscriptionRequest: CreateSubscriptionRequest,
    @Req() req: any,
  ) {
    return this.billingService.createSubscription(
      req.user.userId,
      createSubscriptionRequest.planId,
    );
  }

  @ApiBearerAuth()
  @ApiResponse({
    type: GetSubscriptionResponse,
  })
  @UseGuards(JwtAuthGuard)
  @Get("subscription")
  getSubscription(@Req() req: any) {
    return this.billingService.getCurrentSubscription(req.user.userId);
  }

  @ApiBearerAuth()
  @ApiBody({
    type: CancelSubscriptionDto,
  })
  @ApiResponse({
    status: 200,
    type: CancelSubscriptionResponse,
  })
  @UseGuards(JwtAuthGuard)
  @Post("cancel")
  cancelSubscription(
    @CurrentUser() user: { id: string },
    @Body() dto: CancelSubscriptionDto,
  ) {
    return this.billingService.cancelSubscription(user.id, dto.immediately);
  }

  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    type: ResumeSubscriptionResponse,
  })
  @UseGuards(JwtAuthGuard)
  @Post("resume")
  resumeSubscription(@CurrentUser() user: UserPayload) {
    return this.billingService.resumeSubscription(user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get("invoices")
  listInvoices(@CurrentUser() user: UserPayload) {
    return this.billingService.listInvoices(user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get("portal")
  portalSubscription(@CurrentUser() user: UserPayload) {
    return this.billingService.portalSubscription(user.userId);
  }

  // Stripe calls this — no JWT guard
  @Post("webhook")
  async webhook(
    @Headers("stripe-signature") signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const rawBody =
      (req as any).rawBody?.toString() || JSON.stringify((req as any).body);
    return this.billingService.handleWebhook(rawBody, signature);
  }
}
