import { ApiProperty } from "@nestjs/swagger";

export class AtsScoreRequestDto {
  @ApiProperty({
    type: "string",
    format: "binary",
    description: "Resume file to evaluate against the job description.",
  })
  resume_file: any;

  @ApiProperty({
    type: String,
    description: "Job description used for ATS scoring.",
    example: "We are looking for a backend engineer with Node.js and SQL skills.",
  })
  job_description: string;
}

