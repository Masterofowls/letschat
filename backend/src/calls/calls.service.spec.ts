import { BadRequestException } from '@nestjs/common';
import { CallsService, MAX_CALL_PARTICIPANTS } from './calls.service';
import { CallMediaType } from './call.type';

describe('CallsService', () => {
  const callsRepository = {
    findActiveByRoom: jest.fn(),
    createCall: jest.fn(),
    addParticipant: jest.fn(),
    findById: jest.fn(),
    findParticipant: jest.fn(),
    countActive: jest.fn(),
    reopenParticipant: jest.fn(),
    updateCall: jest.fn(),
    listParticipants: jest.fn(),
    markLeft: jest.fn(),
    updateMedia: jest.fn(),
  };
  const roomsService = {
    assertMembership: jest.fn(),
    findById: jest.fn(),
    getMemberIds: jest.fn(),
    isMember: jest.fn(),
  };
  const usersService = {
    findById: jest.fn(),
    toUserType: jest.fn((u) => u),
  };
  const pubSub = { publish: jest.fn() };

  const service = new CallsService(
    callsRepository as never,
    roomsService as never,
    usersService as never,
    pubSub as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    roomsService.assertMembership.mockResolvedValue(undefined);
    roomsService.findById.mockResolvedValue({ id: 1, isDm: true });
    roomsService.getMemberIds.mockResolvedValue([1, 2]);
    usersService.findById.mockResolvedValue({
      id: 1,
      username: 'a',
      email: 'a@x.com',
    });
    callsRepository.listParticipants.mockResolvedValue([]);
  });

  it('starts a DM audio call and notifies the peer', async () => {
    callsRepository.findActiveByRoom.mockResolvedValue(undefined);
    callsRepository.createCall.mockResolvedValue({
      id: 10,
      roomId: 1,
      createdById: 1,
      mediaType: 'audio',
      status: 'ringing',
      maxParticipants: 2,
      createdAt: new Date(),
      endedAt: null,
    });
    callsRepository.addParticipant.mockResolvedValue({
      id: 1,
      callId: 10,
      userId: 1,
      joinedAt: new Date(),
      leftAt: null,
      muted: false,
      cameraOff: true,
    });
    callsRepository.listParticipants.mockResolvedValue([
      {
        id: 1,
        callId: 10,
        userId: 1,
        joinedAt: new Date(),
        leftAt: null,
        muted: false,
        cameraOff: true,
      },
    ]);

    const call = await service.startCall(
      { roomId: 1, mediaType: CallMediaType.AUDIO },
      1,
    );

    expect(call.id).toBe(10);
    expect(call.maxParticipants).toBe(2);
    expect(call.targetUserIds).toEqual([2]);
    expect(pubSub.publish).toHaveBeenCalled();
  });

  it('rejects joining a full group call', async () => {
    callsRepository.findById.mockResolvedValue({
      id: 5,
      roomId: 9,
      createdById: 1,
      mediaType: 'video',
      status: 'active',
      maxParticipants: MAX_CALL_PARTICIPANTS,
      createdAt: new Date(),
      endedAt: null,
    });
    callsRepository.findParticipant.mockResolvedValue(undefined);
    callsRepository.countActive.mockResolvedValue(4);

    await expect(service.joinCall(5, 99)).rejects.toBeInstanceOf(BadRequestException);
  });
});
