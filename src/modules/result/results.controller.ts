import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { SaveResultDto } from "./dto/response/SaveResultResponse.dto";
import { AgentType, ResultsService } from "./results.service";

@UseGuards(JwtAuthGuard)
@Controller("results")
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  @Post()
  save(@Req() req, @Body() dto: SaveResultDto) {
    return this.resultsService.saveResult(
      req.user.id,
      dto.agentType,
      dto.result,
      dto.metadata,
    );
  }

  @Get()
  list(@Req() req) {
    return this.resultsService.listResults(req.user.id);
  }

  @Get(":agentType")
  get(@Req() req, @Param("agentType") agentType: AgentType) {
    return this.resultsService.getResult(req.user.id, agentType);
  }

  @Delete(":agentType")
  remove(@Req() req, @Param("agentType") agentType: AgentType) {
    return this.resultsService.deleteResult(req.user.id, agentType);
  }
}
