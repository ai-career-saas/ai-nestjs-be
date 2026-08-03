import { Controller, Inject, Get } from "@nestjs/common";
import { PlansService } from "./plans.service";
import { ApiResponse } from "@nestjs/swagger";
import { GetPlansResponseDto } from "./dto/response/GetPlansResponse.dto";

@Controller("plans")
export class PlansController {
  constructor(private plansService: PlansService) {}

  @Get()
  @ApiResponse({
    status: 200,
    type: GetPlansResponseDto,
  })
  async findAll() {
    return this.plansService.findAllPlans();
  }
}
