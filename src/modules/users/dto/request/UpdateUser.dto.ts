import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateUserDto {
    @ApiProperty({
        description: 'The name of the user',
        example: 'John Doe',
    })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    name?: string; // maps to users.name — the existing column, no separate "displayName"

    @ApiProperty({
        description: 'The locale of the user',
        example: 'en',
    })
    @IsOptional()
    @IsIn(['en', 'th'])
    locale?: string;

    @ApiProperty({
        description: 'The timezone of the user',
        example: 'Asia/Bangkok',
    })
    @IsOptional()
    @IsString()
    @MaxLength(64)
    timezone?: string;

    @ApiProperty({
        description: 'Whether to notify the user by email',
        example: true,
    })
    @IsOptional()
    @IsBoolean()
    notifyEmail?: boolean;

    @ApiProperty({
        description: 'Whether to notify the user by product',
        example: true,
    })
    @IsOptional()
    @IsBoolean()
    notifyProduct?: boolean;

    @ApiProperty({
        description: 'Whether to notify the user by usage alerts',
        example: true,
    })
    @IsOptional()
    @IsBoolean()
    notifyUsageAlerts?: boolean;
}
