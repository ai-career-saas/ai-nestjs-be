import { ApiProperty } from "@nestjs/swagger";

export class CancelSubscriptionDto {
  @ApiProperty({
    description:
      "Whether to cancel the subscription immediately or at the end of the current period.",
    required: false,
    type: Boolean,
  })
  immediately?: boolean;
}
