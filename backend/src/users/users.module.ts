import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { UsersResolver } from './users.resolver';
import { UploadsController } from './uploads.controller';

@Module({
  controllers: [UploadsController],
  providers: [UsersService, UsersRepository, UsersResolver],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
