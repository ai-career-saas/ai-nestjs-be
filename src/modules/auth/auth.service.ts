import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database.module';
import { plans, subscriptions, users } from '../../database/schema';
import { RegisterDto, LoginDto } from './dto/auth.dto'; 
import { Response } from 'express';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    private jwt: JwtService,
  ) { }

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();

    const [existing] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const [user] = await this.db
      .insert(users)
      .values({ email, name: dto.name, passwordHash })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        createdAt: users.createdAt,
      });

    const [freePlan] = await this.db
      .select({ id: plans.id })
      .from(plans)
      .where(eq(plans.name, 'Free'))
      .limit(1);
    if (freePlan) {
      await this.db
        .insert(subscriptions)
        .values({ userId: user.id, planId: freePlan.id, status: 'active' })
        .onConflictDoNothing({ target: subscriptions.userId });
    }

    const tokens = this.issueTokens(user);
    return { user: { id: user.id, email: user.email, name: user.name }, ...tokens };
  }

  async login(dto: LoginDto, res: Response) {
    const email = dto.email.toLowerCase();

    const [user] = await this.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const tokens = this.issueTokens(user);

    res.cookie('access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60 * 1000, // 15 min
    });

    res.cookie('refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return { user: { id: user.id, email: user.email, name: user.name }, ...tokens };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET!,
      });

      const [user] = await this.db
        .select({ id: users.id, email: users.email, name: users.name })
        .from(users)
        .where(eq(users.id, payload.sub))
        .limit(1);
      if (!user) throw new UnauthorizedException();

      return this.issueTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getProfile(userId: string) {
    const [profile] = await this.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        created_at: users.createdAt,
        plan_name: plans.name,
        quota: plans.quota,
        sub_status: subscriptions.status,
        current_period_end: subscriptions.currentPeriodEnd,
      })
      .from(users)
      .leftJoin(subscriptions, eq(subscriptions.userId, users.id))
      .leftJoin(plans, eq(plans.id, subscriptions.planId))
      .where(eq(users.id, userId))
      .limit(1);
    if (!profile) throw new UnauthorizedException();

    return profile;
  }

  private issueTokens(user: { id: string; email: string; name: string }) {
    const payload = { sub: user.id, email: user.email, name: user.name };

    return {
      access_token: this.jwt.sign(payload, {
        secret: process.env.JWT_SECRET!,
        expiresIn: '1h',
      }),
      refresh_token: this.jwt.sign(payload, {
        secret: process.env.JWT_REFRESH_SECRET!,
        expiresIn: '7d',
      }),
    };
  }
}
