import { ApiProperty } from "@nestjs/swagger";

export class GetMeResponseDto {
  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty({
    type: String,
  })
  email: string;

  @ApiProperty({
    type: String,
  })
  name: string;

  @ApiProperty({
    type: Date,
  })
  created_at: Date;

  @ApiProperty({
    type: String,
  })
  plan_name: string;

  @ApiProperty({
    type: Object,
  })
  quota: Record<string, number>;

  @ApiProperty({
    type: String,
  })
  sub_status: string;

  @ApiProperty({
    type: Date,
  })
  current_period_end: Date;
}
