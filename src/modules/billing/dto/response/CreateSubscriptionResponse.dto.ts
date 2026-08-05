import { ApiProperty } from "@nestjs/swagger";

export class CreateSubscriptionResponse {
  @ApiProperty({
    type: String,
  })
  checkoutUrl: string;

  @ApiProperty({
    type: String,
  })
  sessionId: string;

  @ApiProperty({
    type: String,
  })
  planName: string;

  @ApiProperty({
    type: Number,
  })
  priceThb: number;
}
