import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { AuthSecurityRepository } from './auth-security.repository';

describe('AuthService', () => {
  const usersService = {
    findByEmail: jest.fn(),
    findByUsername: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
  };
  const jwtService = {
    sign: jest.fn().mockReturnValue('token-123'),
    verify: jest.fn(),
  };
  const configService = {
    get: jest.fn((key: string) => {
      const map: Record<string, string> = {
        WEBAUTHN_RP_ID: 'localhost',
        WEBAUTHN_RP_NAME: 'LetsChat',
        WEBAUTHN_ORIGIN: 'http://localhost:9001',
      };
      return map[key];
    }),
  };
  const securityRepository = {};

  const service = new AuthService(
    usersService as unknown as UsersService,
    jwtService as unknown as JwtService,
    configService as unknown as ConfigService,
    securityRepository as unknown as AuthSecurityRepository,
  );

  const now = new Date('2026-01-01T00:00:00.000Z');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers a new user and returns a JWT payload', async () => {
    usersService.findByEmail.mockResolvedValue(undefined);
    usersService.findByUsername.mockResolvedValue(undefined);
    usersService.create.mockResolvedValue({
      id: 1,
      email: 'ada@example.com',
      username: 'ada',
      passwordHash: 'hash',
      totpEnabled: false,
      createdAt: now,
      updatedAt: now,
    });

    const result = await service.register({
      email: 'ada@example.com',
      username: 'ada',
      password: 'Secret1x',
    });

    expect(result.accessToken).toBe('token-123');
    expect(result.requires2FA).toBe(false);
    expect(result.user?.username).toBe('ada');
  });

  it('rejects duplicate emails on register', async () => {
    usersService.findByEmail.mockResolvedValue({ id: 1 });

    await expect(
      service.register({
        email: 'ada@example.com',
        username: 'ada',
        password: 'Secret1x',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('logs in with valid credentials', async () => {
    const passwordHash = await import('bcryptjs').then((b) => b.hash('Secret1x', 4));
    usersService.findByEmail.mockResolvedValue({
      id: 2,
      email: 'bob@example.com',
      username: 'bob',
      passwordHash,
      totpEnabled: false,
      createdAt: now,
      updatedAt: now,
    });

    const result = await service.login({
      email: 'bob@example.com',
      password: 'Secret1x',
    });

    expect(result.accessToken).toBe('token-123');
    expect(result.user?.id).toBe(2);
  });

  it('returns pending 2FA challenge when totp is enabled', async () => {
    const passwordHash = await import('bcryptjs').then((b) => b.hash('Secret1x', 4));
    usersService.findByEmail.mockResolvedValue({
      id: 3,
      email: 'cara@example.com',
      username: 'cara',
      passwordHash,
      totpEnabled: true,
      totpSecret: 'SECRET',
      createdAt: now,
      updatedAt: now,
    });
    jwtService.sign.mockReturnValue('pending-2fa');

    const result = await service.login({
      email: 'cara@example.com',
      password: 'Secret1x',
    });

    expect(result.requires2FA).toBe(true);
    expect(result.pendingToken).toBe('pending-2fa');
    expect(result.accessToken).toBeNull();
  });

  it('rejects invalid login credentials', async () => {
    usersService.findByEmail.mockResolvedValue(undefined);

    await expect(
      service.login({ email: 'missing@example.com', password: 'x' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
