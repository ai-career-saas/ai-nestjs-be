import { Module } from '@nestjs/common';
import { UsageModule } from 'src/modules/usage/usage.module';
import { UsersController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [UsageModule],
  controllers: [UsersController],
  providers: [UserService],
})
export class UsersModule { }
