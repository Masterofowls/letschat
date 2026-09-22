import { CallMediaType } from './call.type';
import { CallsService } from './calls.service';

describe('CallsService hangup realtime', () => {
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
  const streamVideoService = {
    isConfigured: jest.fn(() => true),
    createUserToken: jest.fn(),
  };
  const pubSub = { publish: jest.fn() };

  const service = new CallsService(
    callsRepository as never,
    roomsService as never,
    usersService as never,
    streamVideoService as never,
    pubSub as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    roomsService.assertMembership.mockResolvedValue(undefined);
    roomsService.getMemberIds.mockResolvedValue([1, 2]);
    usersService.findById.mockImplementation(async (id: number) => ({
      id,
      username: `u${id}`,
      email: `u${id}@x.com`,
    }));
  });

  it('publishes ended call with targetUserIds so the other side auto-closes', async () => {
    const call = {
      id: 10,
      roomId: 1,
      createdById: 1,
      mediaType: 'video',
      status: 'active',
      maxParticipants: 2,
      createdAt: new Date(),
      endedAt: null,
    };
    callsRepository.findById
      .mockResolvedValueOnce(call)
      .mockResolvedValueOnce({ ...call, status: 'ended', endedAt: new Date() });
    callsRepository.listParticipants
      .mockResolvedValueOnce([
        { id: 1, callId: 10, userId: 1, joinedAt: new Date(), leftAt: null, muted: false, cameraOff: false },
        { id: 2, callId: 10, userId: 2, joinedAt: new Date(), leftAt: null, muted: false, cameraOff: false },
      ])
      .mockResolvedValueOnce([
        { id: 1, callId: 10, userId: 1, joinedAt: new Date(), leftAt: new Date(), muted: false, cameraOff: false },
        { id: 2, callId: 10, userId: 2, joinedAt: new Date(), leftAt: new Date(), muted: false, cameraOff: false },
      ]);
    callsRepository.updateCall.mockResolvedValue({
      ...call,
      status: 'ended',
      endedAt: new Date(),
    });

    const result = await service.endCall(10, 1);

    expect(result.status).toBe('ended');
    expect(result.targetUserIds).toEqual([2]);
    expect(result.streamCallId).toBe('letschat-10');
    expect(result.participants?.map((p) => p.userId).sort()).toEqual([1, 2]);
    expect(pubSub.publish).toHaveBeenCalledWith(
      'callUpdated',
      expect.objectContaining({
        callUpdated: expect.objectContaining({
          status: 'ended',
          targetUserIds: [2],
        }),
      }),
    );
  });

  it('ends the whole 1:1 call when one participant leaves', async () => {
    const call = {
      id: 11,
      roomId: 1,
      createdById: 1,
      mediaType: 'audio',
      status: 'active',
      maxParticipants: 2,
      createdAt: new Date(),
      endedAt: null,
    };
    callsRepository.findById
      .mockResolvedValueOnce(call)
      .mockResolvedValueOnce({ ...call, status: 'ended', endedAt: new Date() });
    callsRepository.countActive.mockResolvedValue(1);
    callsRepository.listParticipants
      .mockResolvedValueOnce([
        { id: 2, callId: 11, userId: 2, joinedAt: new Date(), leftAt: null, muted: false, cameraOff: true },
      ])
      .mockResolvedValueOnce([
        { id: 1, callId: 11, userId: 1, joinedAt: new Date(), leftAt: new Date(), muted: false, cameraOff: true },
        { id: 2, callId: 11, userId: 2, joinedAt: new Date(), leftAt: new Date(), muted: false, cameraOff: true },
      ]);
    callsRepository.updateCall.mockResolvedValue({
      ...call,
      status: 'ended',
      endedAt: new Date(),
    });

    const result = await service.leaveCall(11, 1);

    expect(result.status).toBe('ended');
    expect(result.targetUserIds).toEqual([2]);
    expect(pubSub.publish).toHaveBeenCalledWith(
      'callUpdated',
      expect.objectContaining({
        callUpdated: expect.objectContaining({ status: 'ended' }),
      }),
    );
  });

  it('publishes join so both peers learn about each other in realtime', async () => {
    const call = {
      id: 12,
      roomId: 1,
      createdById: 1,
      mediaType: CallMediaType.VIDEO,
      status: 'ringing',
      maxParticipants: 2,
      createdAt: new Date(),
      endedAt: null,
    };
    callsRepository.findById
      .mockResolvedValueOnce(call)
      .mockResolvedValueOnce({ ...call, status: 'active' });
    callsRepository.findParticipant.mockResolvedValue(undefined);
    callsRepository.countActive.mockResolvedValue(1);
    callsRepository.reopenParticipant.mockResolvedValue({
      id: 2,
      callId: 12,
      userId: 2,
      joinedAt: new Date(),
      leftAt: null,
      muted: false,
      cameraOff: false,
    });
    callsRepository.updateCall.mockResolvedValue({ ...call, status: 'active' });
    callsRepository.listParticipants.mockResolvedValue([
      { id: 1, callId: 12, userId: 1, joinedAt: new Date(), leftAt: null, muted: false, cameraOff: false },
      { id: 2, callId: 12, userId: 2, joinedAt: new Date(), leftAt: null, muted: false, cameraOff: false },
    ]);

    const result = await service.joinCall(12, 2);

    expect(result.status).toBe('active');
    expect(result.participants?.map((p) => p.userId).sort()).toEqual([1, 2]);
    expect(result.targetUserIds).toEqual([2]);
    expect(pubSub.publish).toHaveBeenCalledWith(
      'callUpdated',
      expect.objectContaining({
        callUpdated: expect.objectContaining({
          status: 'active',
          participants: expect.arrayContaining([
            expect.objectContaining({ userId: 1 }),
            expect.objectContaining({ userId: 2 }),
          ]),
        }),
      }),
    );
  });
});
