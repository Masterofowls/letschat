import { Module } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { FriendsRepository } from './friends.repository';
import { FriendsResolver } from './friends.resolver';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [FriendsService, FriendsRepository, FriendsResolver],
  exports: [FriendsService],
})
export class FriendsModule {}
