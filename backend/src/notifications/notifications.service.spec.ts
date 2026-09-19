import { NotificationsService } from './notifications.service';
import { NotificationsRepository } from './notifications.repository';
import { NotFoundException } from '@nestjs/common';

describe('NotificationsService', () => {
  const notificationsRepository = {
    findForUser: jest.fn(),
    countUnread: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    createMany: jest.fn(),
  };
  const pubSub = { publish: jest.fn() };

  const service = new NotificationsService(
    notificationsRepository as unknown as NotificationsRepository,
    pubSub as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marks a notification as read', async () => {
    notificationsRepository.markAsRead.mockResolvedValue({ id: 1, isRead: true });
    await expect(service.markAsRead(1, 2)).resolves.toEqual({ id: 1, isRead: true });
  });

  it('throws when notification is missing', async () => {
    notificationsRepository.markAsRead.mockResolvedValue(undefined);
    await expect(service.markAsRead(9, 1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates and publishes notifications for recipients', async () => {
    const created = [
      { id: 1, userId: 2, title: 'New message in general' },
      { id: 2, userId: 3, title: 'New message in general' },
    ];
    notificationsRepository.createMany.mockResolvedValue(created);

    await service.notifyNewMessage({
      recipientIds: [2, 3],
      roomId: 1,
      messageId: 10,
      roomName: 'general',
      preview: 'hi',
    });

    expect(notificationsRepository.createMany).toHaveBeenCalled();
    expect(pubSub.publish).toHaveBeenCalledTimes(2);
  });
});
