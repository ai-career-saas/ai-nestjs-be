import { ApiProperty } from "@nestjs/swagger";

export class GetProfileResponseDto {
    @ApiProperty({
        description: 'The name of the user',
        example: 'John Doe',
    })
    name: string;

    @ApiProperty({
        description: 'The email of the user',
        example: 'john.doe@example.com',
    })
    email: string;

    @ApiProperty({
        description: 'The locale of the user',
        example: 'en',
    })
    locale: string;

    @ApiProperty({
        description: 'The timezone of the user',
        example: 'Asia/Bangkok',
    })
    timezone: string;

    @ApiProperty({
        description: 'Whether to notify the user by email',
        example: true,
    })
    notifyEmail: boolean;

    @ApiProperty({
        description: 'Whether to notify the user by product',
        example: true,
    })
    notifyProduct: boolean;
    
    @ApiProperty({
        description: 'Whether to notify the user by usage alerts',
        example: true,
    })
    notifyUsageAlerts: boolean;
}