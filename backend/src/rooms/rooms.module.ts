import { Module } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { RoomsRepository } from './rooms.repository';
import { RoomsResolver } from './rooms.resolver';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [RoomsService, RoomsRepository, RoomsResolver],
  exports: [RoomsService, RoomsRepository],
})
export class RoomsModule {}
