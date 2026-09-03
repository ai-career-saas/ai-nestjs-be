import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

export const QUESTION_CATEGORIES = [
  "technical",
  "behavioral",
  "situational",
  "culture_fit",
] as const;
export type QuestionCategory = (typeof QUESTION_CATEGORIES)[number];

export const QUESTION_DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type QuestionDifficulty = (typeof QUESTION_DIFFICULTIES)[number];

export class InterviewQuestionDto {
  @ApiProperty()
  @IsInt()
  id: number;

  @ApiProperty({ enum: QUESTION_CATEGORIES })
  @IsIn(QUESTION_CATEGORIES)
  category: QuestionCategory;

  @ApiProperty({ enum: QUESTION_DIFFICULTIES })
  @IsIn(QUESTION_DIFFICULTIES)
  difficulty: QuestionDifficulty;

  @ApiProperty()
  @IsString()
  question: string;

  @ApiProperty()
  @IsString()
  why_asked: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  key_points: string[];

  @ApiProperty()
  @IsString()
  sample_answer_tip: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  follow_up?: string;
}

export class InterviewQuestionResponse {
  @ApiProperty()
  @IsString()
  target_role: string;

  @ApiProperty()
  @IsString()
  experience_level: string;

  @ApiProperty()
  @IsInt()
  total_questions: number;

  @ApiProperty({ type: [InterviewQuestionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InterviewQuestionDto)
  questions: InterviewQuestionDto[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  preparation_tips: string[];

  @ApiProperty()
  @IsString()
  overall_advice: string;
}
