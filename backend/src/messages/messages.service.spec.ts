import { MessagesService } from './messages.service';
import { MessagesRepository } from './messages.repository';
import { RoomsService } from '../rooms/rooms.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('MessagesService', () => {
  const messagesRepository = {
    create: jest.fn(),
    findByRoom: jest.fn(),
  };
  const roomsService = {
    assertMembership: jest.fn(),
    getMemberIds: jest.fn(),
    findById: jest.fn(),
  };
  const notificationsService = {
    notifyNewMessage: jest.fn(),
  };
  const pubSub = {
    publish: jest.fn(),
  };

  const service = new MessagesService(
    messagesRepository as unknown as MessagesRepository,
    roomsService as unknown as RoomsService,
    notificationsService as unknown as NotificationsService,
    pubSub as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('persists a message before publishing', async () => {
    const message = {
      id: 7,
      roomId: 1,
      senderId: 2,
      content: 'hello',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    messagesRepository.create.mockResolvedValue(message);
    roomsService.getMemberIds.mockResolvedValue([2, 3]);
    roomsService.findById.mockResolvedValue({ id: 1, name: 'general' });

    const result = await service.send({ roomId: 1, content: ' hello ' }, 2);

    expect(roomsService.assertMembership).toHaveBeenCalledWith(1, 2);
    expect(messagesRepository.create).toHaveBeenCalledWith({
      roomId: 1,
      senderId: 2,
      content: 'hello',
    });
    expect(pubSub.publish).toHaveBeenCalledWith('messageAdded', { messageAdded: message });
    expect(notificationsService.notifyNewMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientIds: [3],
        roomId: 1,
        messageId: 7,
      }),
    );
    expect(result).toEqual(message);
  });

  it('loads room messages after membership check', async () => {
    messagesRepository.findByRoom.mockResolvedValue([]);

    await service.findByRoom(4, 9);

    expect(roomsService.assertMembership).toHaveBeenCalledWith(4, 9);
    expect(messagesRepository.findByRoom).toHaveBeenCalledWith(4);
  });
});
