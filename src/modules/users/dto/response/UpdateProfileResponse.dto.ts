import { ApiProperty } from "@nestjs/swagger";

export class UpdateProfileResponse {
  @ApiProperty({
    type: String,
  })
  name: string;

  @ApiProperty({
    type: String,
  })
  email: string;

  @ApiProperty({
    type: String,
  })
  locale: string;

  @ApiProperty({
    type: String,
  })
  timezone: string;

  @ApiProperty({
    type: Boolean,
  })
  notifyEmail: boolean;

  @ApiProperty({
    type: Boolean,
  })
  notifyProduct: boolean;

  @ApiProperty({
    type: Boolean,
  })
  notifyUsageAlerts: boolean;
}
