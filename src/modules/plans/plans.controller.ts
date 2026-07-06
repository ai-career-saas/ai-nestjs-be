import { Controller, Inject, Get } from "@nestjs/common";
import { PlansService } from "./plans.service";

@Controller("plans")
export class PlansController {
  constructor(
    private plansService: PlansService,
  ) {}

  @Get()
  async findAll() {
    return this.plansService.findAllPlans();
  }
}
