import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { RoomsRepository } from './rooms.repository';

describe('RoomsService', () => {
  const roomsRepository = {
    create: jest.fn(),
    addMember: jest.fn(),
    findAll: jest.fn(),
    findForUser: jest.fn(),
    findById: jest.fn(),
    isMember: jest.fn(),
    getMembers: jest.fn(),
    getMemberIds: jest.fn(),
  };

  const service = new RoomsService(roomsRepository as unknown as RoomsRepository);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a room and adds the creator as a member', async () => {
    roomsRepository.create.mockResolvedValue({
      id: 10,
      name: 'general',
      description: null,
      createdById: 1,
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
    roomsRepository.findById.mockResolvedValue({ id: 5, name: 'ops' });
    roomsRepository.addMember.mockResolvedValue(undefined);

    const room = await service.join(5, 3);

    expect(room.id).toBe(5);
    expect(roomsRepository.addMember).toHaveBeenCalledWith(5, 3);
  });
});
