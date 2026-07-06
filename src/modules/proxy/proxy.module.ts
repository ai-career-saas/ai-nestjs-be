import {
  Module
} from '@nestjs/common';
import { QuotaGuard } from '../../common/guards/quota.guard';
import { UsageModule } from '../usage/usage.module';
import { Reflector } from '@nestjs/core';
import { ProxyController } from './proxy.controller';

@Module({
  imports: [UsageModule],
  controllers: [ProxyController],
  providers: [QuotaGuard, Reflector],
})
export class ProxyModule { }
