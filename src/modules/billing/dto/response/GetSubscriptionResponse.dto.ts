import { ApiProperty } from "@nestjs/swagger";

export class GetSubscriptionResponse {
  @ApiProperty({
    type: String,
  })
  status: string;

  @ApiProperty({
    type: String,
  })
  plan_name: string;

  @ApiProperty({
    type: Number,
  })
  price_thb: number;

  @ApiProperty({
    type: Object,
  })
  quota: Record<string, number>;

  @ApiProperty({
    type: [String],
  })
  features: String[];

  @ApiProperty({
    type: String,
  })
  description: string;

  @ApiProperty({
    type: String,
  })
  subscriptionStatus: string;

  @ApiProperty({
    type: Boolean,
  })
  cancelAtPeriodEnd: boolean;

  @ApiProperty({
    type: Date,
  })
  currentPeriodEnd: Date;
}
