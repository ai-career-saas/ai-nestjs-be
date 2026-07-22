import { ApiProperty } from "@nestjs/swagger";

export class AuthRefreshTokenResponseDto {
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