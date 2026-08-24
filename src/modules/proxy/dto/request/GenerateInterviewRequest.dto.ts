import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class GenerateInterviewRequestDto {
  @ApiProperty({
    type: "string",
    format: "binary",
    description: "Resume file used to generate interview questions.",
  })
  resume_file: any;

  @ApiProperty({
    type: String,
    description: "Target role for interview question generation.",
    example: "Backend Engineer",
  })
  @IsString()
  target_role: string;

  @ApiPropertyOptional({
    type: String,
    description: "Optional job description for role-specific questions.",
    example: "Build and maintain scalable REST APIs in NestJS.",
  })
  @IsString()
  job_description?: string;

  @ApiPropertyOptional({
    type: String,
    description: "Candidate experience level.",
    default: "mid",
    example: "mid",
  })
  @IsString()
  experience_level?: string;
}
