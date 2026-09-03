import { IsEnum, IsObject, IsOptional } from "class-validator";
import { AgentType } from "../../results.service";

const AGENT_TYPES = [
  "resume_analysis",
  "resume_builder",
  "job_matcher",
  "interview_questions",
  "ats_scorer",
] as const;

export class SaveResultDto {
  @IsEnum(AGENT_TYPES)
  agentType: AgentType;

  @IsObject()
  result: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
