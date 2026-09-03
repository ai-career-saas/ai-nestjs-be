import {
  ApiExtraModels,
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath,
} from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  Max,
  ValidateIf,
  ValidateNested,
} from "class-validator";

// ─────────────────────────────────────────────────────────────
// Enums (kept as string-literal unions to mirror the TS source)
// ─────────────────────────────────────────────────────────────

export const SKILL_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

export const SKILL_CATEGORIES = ["technical", "soft", "domain"] as const;
export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

export const IMPORTANCE_LEVELS = [
  "critical",
  "important",
  "nice-to-have",
] as const;
export type ImportanceLevel = (typeof IMPORTANCE_LEVELS)[number];

export const RESOURCE_COSTS = ["free", "paid"] as const;
export type ResourceCost = (typeof RESOURCE_COSTS)[number];

export const DIFFICULTY_LEVELS = ["easy", "medium", "hard"] as const;
export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

export const VALIDATION_SEVERITIES = ["critical", "warning"] as const;
export type ValidationSeverity = (typeof VALIDATION_SEVERITIES)[number];

export const PATH_TYPES = [
  "has_goal",
  "no_goal_sufficient",
  "no_goal_insufficient",
  "skill_upgrade",
] as const;
export type PathType = (typeof PATH_TYPES)[number];

// ─────────────────────────────────────────────────────────────
// Shared building blocks
// ─────────────────────────────────────────────────────────────

export class SkillInfoDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: SKILL_LEVELS })
  @IsIn(SKILL_LEVELS)
  level: SkillLevel;

  @ApiProperty({ enum: SKILL_CATEGORIES })
  @IsIn(SKILL_CATEGORIES)
  category: SkillCategory;
}

export class SkillGapDto {
  @ApiProperty()
  @IsString()
  skill: string;

  @ApiProperty({ enum: IMPORTANCE_LEVELS })
  @IsIn(IMPORTANCE_LEVELS)
  importance: ImportanceLevel;

  @ApiProperty()
  @IsString()
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  learn_time?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  free_resource?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  demand_score?: number;
}

export class ResourceDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  url: string;

  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty({ enum: RESOURCE_COSTS })
  @IsIn(RESOURCE_COSTS)
  cost: ResourceCost;
}

export class SalaryRangeDto {
  @ApiProperty()
  @IsString()
  min: string;

  @ApiProperty()
  @IsString()
  max: string;

  @ApiProperty()
  @IsString()
  currency: string;

  @ApiProperty()
  @IsString()
  period: string;
}

// ─────────────────────────────────────────────────────────────
// Roadmap
// ─────────────────────────────────────────────────────────────

export class RoadmapMilestoneDto {
  @ApiProperty()
  @IsString()
  week: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  focus?: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  tasks: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deliverable?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  success_metric?: string;

  @ApiPropertyOptional({ type: [ResourceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResourceDto)
  resources?: ResourceDto[];
}

export class CareerRoadmapDto {
  @ApiProperty()
  @IsString()
  target_role: string;

  @ApiProperty()
  @IsString()
  total_duration: string;

  @ApiProperty({ type: [RoadmapMilestoneDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoadmapMilestoneDto)
  milestones: RoadmapMilestoneDto[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  key_certifications: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  daily_commitment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  motivational_message?: string;
}

// ─────────────────────────────────────────────────────────────
// has_goal path
// ─────────────────────────────────────────────────────────────

export class CareerRecommendationDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsNumber()
  match_score: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class CurrentProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  current_role?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  years_experience?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  education?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  summary?: string;
}

export class HasGoalAnalysisDto {
  @ApiProperty({ enum: ["has_goal"] })
  @IsIn(["has_goal"])
  path_type: "has_goal";

  @ApiProperty({ type: CurrentProfileDto, nullable: true })
  @ValidateIf((_o, value) => value !== null)
  @ValidateNested()
  @Type(() => CurrentProfileDto)
  current_profile: CurrentProfileDto | null;

  @ApiProperty({ type: [SkillInfoDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillInfoDto)
  detected_skills: SkillInfoDto[];

  @ApiProperty({ type: [CareerRecommendationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CareerRecommendationDto)
  recommended_careers: CareerRecommendationDto[];

  @ApiProperty({ type: [SkillGapDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillGapDto)
  skill_gaps: SkillGapDto[];

  @ApiProperty({ type: CareerRoadmapDto, nullable: true })
  @ValidateIf((_o, value) => value !== null)
  @ValidateNested()
  @Type(() => CareerRoadmapDto)
  roadmap: CareerRoadmapDto | null;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  market_insights: string[];

  @ApiPropertyOptional({ type: SalaryRangeDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SalaryRangeDto)
  salary_range?: SalaryRangeDto;

  @ApiPropertyOptional({ type: "object", additionalProperties: true })
  @IsOptional()
  @IsObject()
  preferences_applied?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────
// no_goal_sufficient path
// ─────────────────────────────────────────────────────────────

export class ReadyCareerDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsNumber()
  match_score: number;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  matched_skills: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  missing_minor: string[];

  @ApiProperty()
  @IsString()
  salary_range: string;

  @ApiProperty()
  @IsString()
  why_good_fit: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  typical_companies: string[];

  @ApiProperty()
  @IsString()
  time_to_ready: string;
}

export class NearReachMissingSkillDto {
  @ApiProperty()
  @IsString()
  skill: string;

  @ApiProperty({ enum: IMPORTANCE_LEVELS })
  @IsIn(IMPORTANCE_LEVELS)
  importance: ImportanceLevel;

  @ApiProperty()
  @IsString()
  learn_time: string;
}

export class NearReachCareerDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsNumber()
  current_coverage: number;

  @ApiProperty({ type: [NearReachMissingSkillDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NearReachMissingSkillDto)
  missing_skills: NearReachMissingSkillDto[];

  @ApiProperty()
  @IsString()
  total_upskill_time: string;

  @ApiProperty()
  @IsString()
  salary_range: string;

  @ApiProperty()
  @IsString()
  why_worth_it: string;
}

export class NoGoalSufficientAnalysisDto {
  @ApiProperty({ enum: ["no_goal_sufficient"] })
  @IsIn(["no_goal_sufficient"])
  path_type: "no_goal_sufficient";

  @ApiProperty({ type: [SkillInfoDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillInfoDto)
  detected_skills: SkillInfoDto[];

  @ApiProperty({ type: [ReadyCareerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReadyCareerDto)
  ready_careers: ReadyCareerDto[];

  @ApiProperty({ type: [NearReachCareerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NearReachCareerDto)
  near_reach_careers: NearReachCareerDto[];

  @ApiProperty({ type: [ReadyCareerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReadyCareerDto)
  recommended_careers: ReadyCareerDto[];

  @ApiProperty({ enum: [true] })
  @IsBoolean()
  skill_sufficient: true;
}

// ─────────────────────────────────────────────────────────────
// no_goal_insufficient path
// ─────────────────────────────────────────────────────────────

export class MultiGapCareerDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ enum: DIFFICULTY_LEVELS })
  @IsIn(DIFFICULTY_LEVELS)
  difficulty: DifficultyLevel;

  @ApiProperty()
  @IsNumber()
  current_coverage: number;

  @ApiProperty()
  @IsNumber()
  match_score: number;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsString()
  salary_range: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  matched_skills: string[];

  @ApiProperty({ type: [SkillGapDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillGapDto)
  skill_gaps: SkillGapDto[];

  @ApiProperty()
  @IsString()
  total_upskill_time: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  roadmap_summary: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  typical_companies: string[];

  @ApiProperty()
  @IsString()
  why_recommended: string;
}

export class NoGoalInsufficientAnalysisDto {
  @ApiProperty({ enum: ["no_goal_insufficient"] })
  @IsIn(["no_goal_insufficient"])
  path_type: "no_goal_insufficient";

  @ApiProperty({ type: [SkillInfoDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillInfoDto)
  detected_skills: SkillInfoDto[];

  @ApiProperty({ type: [MultiGapCareerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MultiGapCareerDto)
  recommended_careers: MultiGapCareerDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  easiest_path?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  highest_salary_path?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  overall_advice?: string;

  @ApiProperty({ enum: [false] })
  @IsBoolean()
  skill_sufficient: false;
}

// ─────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────

export class ValidationIssueDto {
  @ApiProperty()
  @IsString()
  section: string;

  @ApiProperty({ enum: VALIDATION_SEVERITIES })
  @IsIn(VALIDATION_SEVERITIES)
  severity: ValidationSeverity;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  field?: string;

  @ApiProperty()
  @IsString()
  issue: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fix?: string;
}

export class ValidationInfoDto {
  @ApiProperty()
  @IsBoolean()
  passed: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  quality_score?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({ type: [ValidationIssueDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ValidationIssueDto)
  warnings?: ValidationIssueDto[];

  @ApiPropertyOptional({ type: [ValidationIssueDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ValidationIssueDto)
  critical_issues?: ValidationIssueDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  retry_count?: number;
}

// ─────────────────────────────────────────────────────────────
// AnalysisResult discriminated union
//
// class-transformer's @Type discriminator needs each branch to be a
// distinct class, and NestJS's ValidationPipe (with `transform: true`)
// will pick the right one at runtime based on `path_type`. Swagger
// can't natively render discriminated unions from class-validator
// alone, so `@ApiExtraModels` + a manual oneOf schema is added on the
// field for accurate docs.
// ─────────────────────────────────────────────────────────────

export type AnalysisResultDto =
  | HasGoalAnalysisDto
  | NoGoalSufficientAnalysisDto
  | NoGoalInsufficientAnalysisDto;

@ApiExtraModels(
  HasGoalAnalysisDto,
  NoGoalSufficientAnalysisDto,
  NoGoalInsufficientAnalysisDto,
)
export class AnalysisResponseDto {
  @ApiProperty()
  @IsString()
  user_id: string;

  @ApiProperty({ enum: PATH_TYPES })
  @IsIn(PATH_TYPES)
  path_type: PathType;

  @ApiProperty()
  @IsString()
  message: string;

  @ApiProperty({
    oneOf: [
      { $ref: getSchemaPath(HasGoalAnalysisDto) },
      { $ref: getSchemaPath(NoGoalSufficientAnalysisDto) },
      { $ref: getSchemaPath(NoGoalInsufficientAnalysisDto) },
    ],
  })
  @ValidateNested()
  @Type(() => Object, {
    discriminator: {
      property: "path_type",
      subTypes: [
        { value: HasGoalAnalysisDto, name: "has_goal" },
        { value: NoGoalSufficientAnalysisDto, name: "no_goal_sufficient" },
        { value: NoGoalInsufficientAnalysisDto, name: "no_goal_insufficient" },
      ],
    },
    keepDiscriminatorProperty: true,
  })
  analysis: AnalysisResultDto;

  @ApiPropertyOptional({ type: ValidationInfoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ValidationInfoDto)
  validation?: ValidationInfoDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  error?: string;
}

// ─────────────────────────────────────────────────────────────
// skill_upgrade path
//
// Note: "skill_upgrade" is a PathType value, but it is NOT a member
// of AnalysisResult — it's returned from a separate endpoint/flow
// with its own response shape entirely (SkillUpgradeResponse in the
// FE types), so it gets its own top-level DTO rather than a branch
// of AnalysisResponseDto.analysis.
// ─────────────────────────────────────────────────────────────

export class SkillUpgradeResponseDto {
  @ApiProperty()
  @IsString()
  user_id: string;

  @ApiProperty()
  @IsString()
  selected_career: string;

  @ApiProperty({ type: "object", additionalProperties: true, nullable: true })
  @ValidateIf((_o, value) => value !== null)
  @IsObject()
  skill_upgrade_plan: Record<string, unknown> | null;

  @ApiProperty()
  @IsString()
  message: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  error?: string;
}
