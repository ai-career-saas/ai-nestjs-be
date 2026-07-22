import { ApiProperty } from "@nestjs/swagger";

class UserDto {
  @ApiProperty({
    description: "User ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  id: string;

  @ApiProperty({ description: "User email", example: "john.doe@example.com" })
  email: string;

  @ApiProperty({ description: "User name", example: "John Doe" })
  name: string;
}

export class AuthResponseDto {
  @ApiProperty({ description: "Authenticated user information", type: UserDto })
  user: UserDto;

  @ApiProperty({
    description: "Access token for authentication",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  access_token: string;

  @ApiProperty({
    description: "Refresh token for authentication",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  refresh_token: string;
}
