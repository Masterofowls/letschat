import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsResolver } from './notifications.resolver';

@Module({
  providers: [NotificationsService, NotificationsRepository, NotificationsResolver],
  exports: [NotificationsService],
})
export class NotificationsModule {}
