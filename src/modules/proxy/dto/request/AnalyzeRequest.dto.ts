import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AnalyzeRequestDto {
  @ApiProperty({
    type: "string",
    format: "binary",
    description: "Optional resume file to include in analysis.",
  })
  file: any;

  @ApiProperty({
    type: String,
    description: "User message or prompt for analysis.",
    example: "Analyze my background for a Data Engineer path",
  })
  message: string;

  @ApiProperty({
    type: String,
    description: "Target career goal for the analysis.",
    example: "Data Engineer",
  })
  career_goal: string;

  @ApiPropertyOptional({
    type: String,
    description: "Preferences as JSON string.",
    example: '{"focus":"roadmap","timeline":"6 months"}',
  })
  preferences?: string;
}

