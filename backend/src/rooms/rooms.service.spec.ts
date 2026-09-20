import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { RoomsRepository } from './rooms.repository';
import { FriendsService } from '../friends/friends.service';
import { UsersService } from '../users/users.service';

describe('RoomsService', () => {
  const roomsRepository = {
    create: jest.fn(),
    addMember: jest.fn(),
    findAll: jest.fn(),
    findAllPublic: jest.fn(),
    findForUser: jest.fn(),
    findById: jest.fn(),
    findByDmKey: jest.fn(),
    isMember: jest.fn(),
    getMembers: jest.fn(),
    getMemberIds: jest.fn(),
  };

  const friendsService = {
    friendshipStatus: jest.fn(),
  };

  const usersService = {
    findById: jest.fn(),
    toPublicUserType: jest.fn((u) => u),
  };

  const service = new RoomsService(
    roomsRepository as unknown as RoomsRepository,
    friendsService as unknown as FriendsService,
    usersService as unknown as UsersService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a room and adds the creator as a member', async () => {
    roomsRepository.create.mockResolvedValue({
      id: 10,
      name: 'general',
      description: null,
      createdById: 1,
      isDm: false,
    });

    const room = await service.create({ name: 'general' }, 1);

    expect(room.id).toBe(10);
    expect(roomsRepository.addMember).toHaveBeenCalledWith(10, 1);
  });

  it('throws when room is missing', async () => {
    roomsRepository.findById.mockResolvedValue(undefined);

    await expect(service.findById(99)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('asserts membership and forbids non-members', async () => {
    roomsRepository.isMember.mockResolvedValue(false);

    await expect(service.assertMembership(1, 2)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('joins an existing room', async () => {
    roomsRepository.findById.mockResolvedValue({ id: 5, name: 'ops', isDm: false });
    roomsRepository.addMember.mockResolvedValue(undefined);

    const room = await service.join(5, 3);

    expect(room.id).toBe(5);
    expect(roomsRepository.addMember).toHaveBeenCalledWith(5, 3);
  });

  it('opens a DM for accepted friends', async () => {
    friendsService.friendshipStatus.mockResolvedValue('friends');
    roomsRepository.findByDmKey.mockResolvedValue(undefined);
    usersService.findById
      .mockResolvedValueOnce({ id: 1, username: 'ada' })
      .mockResolvedValueOnce({ id: 2, username: 'bob' });
    roomsRepository.create.mockResolvedValue({
      id: 99,
      name: 'ada · bob',
      isDm: true,
      dmKey: '1:2',
    });

    const room = await service.openDirectMessage(1, 2);

    expect(room.id).toBe(99);
    expect(roomsRepository.addMember).toHaveBeenCalledWith(99, 1);
    expect(roomsRepository.addMember).toHaveBeenCalledWith(99, 2);
  });
});
