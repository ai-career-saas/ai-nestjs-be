import { Controller, UseGuards, Get, Req, Patch, Body } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UsageService } from "../usage/usage.service";
import { ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { UserService } from "./user.service";
import { UpdateUserDto } from "./dto/request/UpdateUser.dto";
import { CurrentUser } from "src/common/decorators/currentuser.decorator";
import { UserPayload } from "src/common/interfaces/UserPayload.interface";
import { GetProfileResponseDto } from "./dto/response/GetProfileResponse.dto";
import { GetUsageResponse } from "./dto/response/GetUsageResponse.dto";
import { UpdateProfileResponse } from "./dto/response/UpdateProfileResponse.dto";

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller("users")
export class UsersController {
  constructor(
    private usage: UsageService,
    private userService: UserService,
  ) {}

  @Get("usage")
  @ApiResponse({
    status: 200,
    type: GetUsageResponse,
  })
  async getUsage(@Req() req: any) {
    const userId = req.user.userId;
    const features = ["analyze", "interview_gen", "ats_score"];
    const result: Record<string, any> = {};
    for (const f of features) {
      result[f] = await this.usage.getUsageForUser(userId, f);
    }

    return result;
  }

  @Get()
  @ApiResponse({
    status: 200,
    description: "Get user profile",
    type: GetProfileResponseDto,
  })
  getProfile(@CurrentUser() user: UserPayload): Promise<GetProfileResponseDto> {
    return this.userService.getProfile(user.userId);
  }

  @Patch()
  @ApiResponse({
    status: 200,
    description: "Update user profile",
    type: UpdateProfileResponse,
  })
  updateProfile(@CurrentUser() user: UserPayload, @Body() dto: UpdateUserDto) {
    return this.userService.update(user.userId, dto);
  }
}
