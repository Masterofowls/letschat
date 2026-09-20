import { Module } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { RoomsRepository } from './rooms.repository';
import { RoomsResolver } from './rooms.resolver';
import { UsersModule } from '../users/users.module';
import { FriendsModule } from '../friends/friends.module';

@Module({
  imports: [UsersModule, FriendsModule],
  providers: [RoomsService, RoomsRepository, RoomsResolver],
  exports: [RoomsService, RoomsRepository],
})
export class RoomsModule {}
