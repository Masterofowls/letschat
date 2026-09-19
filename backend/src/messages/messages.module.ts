import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesRepository } from './messages.repository';
import { MessagesResolver } from './messages.resolver';
import { RoomsModule } from '../rooms/rooms.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [RoomsModule, UsersModule, NotificationsModule],
  providers: [MessagesService, MessagesRepository, MessagesResolver],
  exports: [MessagesService],
})
export class MessagesModule {}
