import { ApiProperty } from "@nestjs/swagger";

export class GetPlansResponseDto {
  @ApiProperty({
    description: "Plan ID",
    example: "plan_1234567890",
  })
  id: string;

  @ApiProperty({
    description: "Plan name",
    example: "Basic Plan",
  })
  name: string;

  @ApiProperty({
    description: "Plan description",
    example: "This is a basic plan with limited features.",
  })
  description: string;

  @ApiProperty({
    description: "Price in Thai Baht",
    example: 199.99,
  })
  price_thb: number;

  @ApiProperty({
    description: "Stripe price ID for the plan",
    example: "price_1234567890",
  })
  stripe_price_id: string;

  @ApiProperty({
    description: "Quota for the plan",
    example: 100,
  })
  quota: number;

  @ApiProperty({
    description: "Features included in the plan",
    example: ["Feature 1", "Feature 2", "Feature 3"],
  })
  features: string[];
}
