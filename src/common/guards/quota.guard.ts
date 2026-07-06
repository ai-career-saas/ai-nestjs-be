import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsageService } from 'src/modules/usage/usage.service';


export const FEATURE_KEY = 'feature';

@Injectable()
export class QuotaGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private usage: UsageService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.get<string>(FEATURE_KEY, ctx.getHandler());
    if (!feature) return true;

    const req = ctx.switchToHttp().getRequest();
    const userId = req.user?.userId;
    if (!userId) return false;

    const { used, limit } = await this.usage.getUsageForUser(userId, feature);
    if (used >= limit) {
      throw new ForbiddenException(
        `Monthly quota exceeded for ${feature} (${used}/${limit}). Please upgrade your plan.`,
      );
    }

    await this.usage.incrementUsage(userId, feature);
    return true;
  }
}
