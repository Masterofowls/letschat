import {
  checkMediaPermissions,
  describePermissionError,
  listMediaDevices,
  queryMediaPermission,
} from '../media-permissions';

describe('media-permissions', () => {
  const originalNavigator = global.navigator;

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      configurable: true,
    });
  });

  it('reports unsupported permission query gracefully', async () => {
    Object.defineProperty(global, 'navigator', {
      value: { permissions: undefined, mediaDevices: undefined },
      configurable: true,
    });
    await expect(queryMediaPermission('microphone')).resolves.toBe('unsupported');
  });

  it('lists microphones and cameras from enumerateDevices', async () => {
    Object.defineProperty(global, 'navigator', {
      value: {
        mediaDevices: {
          enumerateDevices: jest.fn().mockResolvedValue([
            { kind: 'audioinput', deviceId: 'm1', label: 'Mic' },
            { kind: 'videoinput', deviceId: 'c1', label: 'Cam' },
            { kind: 'audiooutput', deviceId: 's1', label: 'Speaker' },
          ]),
        },
      },
      configurable: true,
    });

    const devices = await listMediaDevices();
    expect(devices.hasMicrophone).toBe(true);
    expect(devices.hasCamera).toBe(true);
    expect(devices.microphones).toHaveLength(1);
    expect(devices.cameras).toHaveLength(1);
  });

  it('aggregates permission check result', async () => {
    Object.defineProperty(global, 'navigator', {
      value: {
        permissions: {
          query: jest.fn().mockResolvedValue({ state: 'granted' }),
        },
        mediaDevices: {
          enumerateDevices: jest.fn().mockResolvedValue([]),
        },
      },
      configurable: true,
    });
    const previous = window.isSecureContext;
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: true,
    });

    try {
      const result = await checkMediaPermissions();
      expect(result.microphone).toBe('granted');
      expect(result.camera).toBe('granted');
      expect(result.secureContext).toBe(true);
    } finally {
      Object.defineProperty(window, 'isSecureContext', {
        configurable: true,
        value: previous,
      });
    }
  });

  it('describes NotAllowedError for users', () => {
    const err = new Error('Denied');
    (err as { name: string }).name = 'NotAllowedError';
    expect(describePermissionError(err)).toMatch(/Permission denied/i);
  });

  it('describes missing device errors', () => {
    const err = new Error('gone');
    (err as { name: string }).name = 'NotFoundError';
    expect(describePermissionError(err)).toMatch(/No microphone or camera/i);
  });
});
