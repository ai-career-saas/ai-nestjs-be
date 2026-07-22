import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ValidateNested } from "class-validator";

export class ResourceDto {
  @ApiProperty({
    example: "JavaScript Algorithms and Data Structures",
  })
  name: string;

  @ApiProperty({
    example: "https://www.freecodecamp.org/",
  })
  url: string;

  @ApiProperty({
    example: "Course",
  })
  type: string;

  @ApiProperty({
    example: "Free",
  })
  cost: string;
}

export class GapAnalysisDto {
  @ApiProperty({
    example: "Docker",
  })
  skill: string;

  @ApiProperty({
    example: "Beginner",
  })
  current_level: string;

  @ApiProperty({
    example: "Intermediate",
  })
  required_level: string;

  @ApiProperty({
    example: "High",
  })
  importance: string;

  @ApiProperty({
    example: "Required for deploying applications.",
  })
  reason: string;

  @ApiProperty({
    example: "2-3 weeks",
  })
  learn_time: string;

  @ApiProperty({
    type: [ResourceDto],
  })
  @ValidateNested({ each: true })
  @Type(() => ResourceDto)
  resources: ResourceDto[];
}

export class LearningRoadmapDto {
  @ApiProperty({
    example: "Phase 1",
  })
  phase: string;

  @ApiProperty({
    example: "Backend Fundamentals",
  })
  focus: string;

  @ApiProperty({
    example: ["Node.js", "Express", "REST API"],
  })
  skills: string[];

  @ApiProperty({
    example: "Build and deploy a REST API",
  })
  milestone: string;
}

export class SkillUpgradeResponseDto {
  @ApiProperty({
    example: "Backend Developer",
  })
  target_career: string;

  @ApiProperty({
    example: 68,
  })
  current_coverage: number;

  @ApiProperty({
    type: [GapAnalysisDto],
  })
  @ValidateNested({ each: true })
  @Type(() => GapAnalysisDto)
  gap_analysis: GapAnalysisDto[];

  @ApiProperty({
    type: [LearningRoadmapDto],
  })
  @ValidateNested({ each: true })
  @Type(() => LearningRoadmapDto)
  learning_roadmap: LearningRoadmapDto[];

  @ApiProperty({
    example: "4-6 months",
  })
  total_time: string;

  @ApiProperty({
    example: "20-30%",
  })
  salary_increase: string;

  @ApiProperty({
    example:
      "You already have a strong foundation. Focusing on Docker, CI/CD, and cloud technologies will significantly improve your employability.",
  })
  motivation: string;
}
