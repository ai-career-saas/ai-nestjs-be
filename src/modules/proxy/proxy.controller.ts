import {
  Controller,
  UseGuards,
  Post,
  UseInterceptors,
  Body,
  UploadedFile,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import axios from "axios";
import { Feature } from "src/common/decorators/feature.decorator";
import { QuotaGuard } from "src/common/guards/quota.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import FormData from "form-data";
import { AnalyzeRequestDto } from "./dto/request/AnalyzeRequest.dto";
import { AtsScoreRequestDto } from "./dto/request/AtsScoreRequest.dto";
import { GenerateInterviewRequestDto } from "./dto/request/GenerateInterviewRequest.dto";
import { SkillUpgradeRequestDto } from "./dto/request/SkillUpgradeRequest.dto";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiResponse,
} from "@nestjs/swagger";
import { SkillUpgradeResponseDto } from "./dto/response/SkillUpgradeResponse.dto";
import { AnalysisResponseDto } from "./dto/response/AnalyzeResponse.dto";
import { InterviewQuestionResponse } from "./dto/response/InterviewQuestPrepResponse.dto";
import { ATSScoreResponse } from "./dto/response/AtsScoringResponse.dto";

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";

async function forwardToFastAPI(
  path: string,
  body: Record<string, any>,
  file?: Express.Multer.File,
  files?: Express.Multer.File[],
) {
  const form = new FormData();

  for (const [key, value] of Object.entries(body)) {
    if (value !== undefined && value !== null) {
      form.append(
        key,
        typeof value === "object" ? JSON.stringify(value) : String(value),
      );
    }
  }

  if (file) {
    form.append("resume_file", file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });
  }

  if (files) {
    for (const f of files) {
      form.append("resume_file", f.buffer, {
        filename: f.originalname,
        contentType: f.mimetype,
      });
    }
  }

  const response = await axios.post(`${FASTAPI_URL}${path}`, form, {
    headers: form.getHeaders(),
    timeout: 300000, // 5 min for LangGraph
  });

  return response.data;
}

@ApiBearerAuth()
@Controller("ai")
export class ProxyController {
  // ── Career Analysis ──────────────────────────────────────────────
  @UseGuards(JwtAuthGuard, QuotaGuard)
  @Feature("analyze")
  @Post("analyze")
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiResponse({
    status: 200,
    description: "Career analysis result from AI service",
    type: AnalysisResponseDto,
  })
  @ApiBody({
    type: AnalyzeRequestDto,
  })
  async analyze(@Body() body: any, @UploadedFile() file?: Express.Multer.File) {
    return forwardToFastAPI(
      "/analyze",
      {
        message: body.message,
        career_goal: body.career_goal,
        preferences: body.preferences,
      },
      file,
    );
  }

  // ── Interview Question Generator ─────────────────────────────────
  @UseGuards(JwtAuthGuard, QuotaGuard)
  @Feature("interview_gen")
  @Post("interview/generate")
  @UseInterceptors(FileInterceptor("resume_file"))
  @ApiConsumes("multipart/form-data")
  @ApiResponse({
    status: 200,
    description: "Generated interview questions from AI service",
    type: InterviewQuestionResponse,
  })
  @ApiBody({
    type: GenerateInterviewRequestDto,
  })
  async generateInterview(
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return forwardToFastAPI(
      "/interview/generate",
      {
        target_role: body.target_role,
        job_description: body.job_description || "",
        experience_level: body.experience_level || "mid",
      },
      file,
    );
  }

  // ── ATS Resume Scoring ───────────────────────────────────────────
  @UseGuards(JwtAuthGuard, QuotaGuard)
  @Feature("ats_score")
  @Post("ats/score")
  @UseInterceptors(FileInterceptor("resume_file"))
  @ApiConsumes("multipart/form-data")
  @ApiResponse({
    status: 200,
    type: ATSScoreResponse,
  })
  @ApiBody({
    type: AtsScoreRequestDto,
  })
  async atsScore(
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return forwardToFastAPI(
      "/ats/score",
      {
        job_description: body.job_description,
      },
      file,
    );
  }

  // ── Skill Upgrade (no quota — uses existing session data) ─────────
  @ApiResponse({
    status: 200,
    description: "Skill upgrade plan generated from AI service",
    type: SkillUpgradeResponseDto,
  })
  @ApiBody({
    type: SkillUpgradeRequestDto,
  })
  @UseGuards(JwtAuthGuard)
  @Post("skill-upgrade")
  skillUpgrade(@Body() body: SkillUpgradeRequestDto) {
    return forwardToFastAPI("/skill-upgrade", {
      career_title: body.careerTitle,
    });
  }
}
