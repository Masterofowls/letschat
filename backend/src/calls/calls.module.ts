import { Module } from '@nestjs/common';
import { CallsService } from './calls.service';
import { CallsRepository } from './calls.repository';
import { CallsResolver } from './calls.resolver';
import { RoomsModule } from '../rooms/rooms.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [RoomsModule, UsersModule],
  providers: [CallsService, CallsRepository, CallsResolver],
  exports: [CallsService],
})
export class CallsModule {}
