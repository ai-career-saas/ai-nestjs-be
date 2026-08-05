import { ApiProperty } from "@nestjs/swagger";

export class CreateSubscriptionRequest {
  @ApiProperty({
    type: String,
    example: "plan_1234567890",
  })
  planId: string;
}
