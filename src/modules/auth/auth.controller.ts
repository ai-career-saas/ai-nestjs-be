import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { RegisterDto, LoginDto, RefreshDto } from "./dto/request/auth.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { Response } from "express";
import { AuthResponseDto } from "./dto/response/AuthResponse.dto";
import { AuthRefreshTokenResponseDto } from "./dto/response/AuthRefreshTokenResponse.dto";
import { GetMeResponseDto } from "./dto/response/GetMeResponse.dto";

@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post("register")
  @ApiResponse({
    status: 201,
    description: "User registered successfully",
    type: AuthResponseDto,
  })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post("login")
  @ApiResponse({
    status: 200,
    description: "Login successful",
    type: AuthResponseDto,
  })
  login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.auth.login(dto, res);
  }

  @Post("refresh")
  @ApiResponse({
    status: 200,
    description: "Token refreshed successfully",
    type: AuthRefreshTokenResponseDto,
  })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refresh_token);
  }

  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    type: GetMeResponseDto,
  })
  @UseGuards(JwtAuthGuard)
  @Get("me")
  me(@Req() req: any) {
    return this.auth.getProfile(req.user.userId);
  }
}
