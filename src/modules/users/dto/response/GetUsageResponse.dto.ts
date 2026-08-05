import { ApiProperty } from "@nestjs/swagger";

export class GetUsageResponse {
  @ApiProperty({
    type: Number,
  })
  used: number;

  @ApiProperty({
    type: Number,
  })
  limit: number;

  @ApiProperty({
    type: Number,
  })
  remaining: number;
}
