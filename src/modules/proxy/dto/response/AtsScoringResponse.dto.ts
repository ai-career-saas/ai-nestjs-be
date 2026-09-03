import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

export const ATS_IMPORTANCE_LEVELS = [
  "critical",
  "important",
  "nice-to-have",
] as const;
export type ATSImportanceLevel = (typeof ATS_IMPORTANCE_LEVELS)[number];

export class ATSKeywordMatchDto {
  @ApiProperty()
  @IsString()
  keyword: string;

  @ApiProperty()
  @IsBoolean()
  found: boolean;

  @ApiProperty({ enum: ATS_IMPORTANCE_LEVELS })
  @IsIn(ATS_IMPORTANCE_LEVELS)
  importance: ATSImportanceLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  context?: string;
}

export class ATSSectionDto {
  @ApiProperty()
  @IsString()
  section: string;

  @ApiProperty()
  @IsNumber()
  score: number;

  @ApiProperty()
  @IsString()
  feedback: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  issues: string[];
}

export class ATSScoreResponse {
  @ApiProperty()
  @IsNumber()
  overall_score: number;

  @ApiProperty()
  @IsString()
  grade: string;

  @ApiProperty()
  @IsNumber()
  keyword_match_rate: number;

  @ApiProperty({ type: [ATSKeywordMatchDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ATSKeywordMatchDto)
  keyword_matches: ATSKeywordMatchDto[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  missing_critical_keywords: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  missing_important_keywords: string[];

  @ApiProperty({ type: [ATSSectionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ATSSectionDto)
  sections: ATSSectionDto[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  formatting_issues: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  strengths: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  suggestions: string[];

  @ApiProperty()
  @IsString()
  summary: string;

  @ApiProperty()
  @IsString()
  estimated_pass_rate: string;
}
