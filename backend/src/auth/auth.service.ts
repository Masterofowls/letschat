import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as OTPAuth from 'otpauth';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type AuthenticatorTransport,
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON,
} from '@simplewebauthn/server';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { AuthSecurityRepository } from './auth-security.repository';
import { RegisterInput, LoginInput } from './auth.dto';
import {
  AuthPayload,
  AvailabilityResult,
  TotpSetupPayload,
  WebAuthnOptionsPayload,
  QrLoginSessionPayload,
} from './auth.type';
import { User } from '../database/schema';

const challenges = new Map<string, string>();

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly securityRepository: AuthSecurityRepository,
  ) {}

  private get rpID(): string {
    return this.configService.get<string>('WEBAUTHN_RP_ID') || 'localhost';
  }

  private get rpName(): string {
    return this.configService.get<string>('WEBAUTHN_RP_NAME') || 'LetsChat';
  }

  private get origin(): string {
    return (
      this.configService.get<string>('WEBAUTHN_ORIGIN') ||
      this.configService.get<string>('FRONTEND_URL') ||
      'http://localhost:9001'
    );
  }

  private createTotp(secret: string, label = 'user') {
    return new OTPAuth.TOTP({
      issuer: this.rpName,
      label,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });
  }

  private verifyTotpCode(secret: string, code: string, label = 'user'): boolean {
    const delta = this.createTotp(secret, label).validate({
      token: code.replace(/\s/g, ''),
      window: 1,
    });
    return delta !== null;
  }

  async checkEmail(email: string): Promise<AvailabilityResult> {
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      return { available: false, message: 'Enter a valid email address' };
    }
    const existing = await this.usersService.findByEmail(normalized);
    if (existing) {
      return { available: false, message: 'Email already registered' };
    }
    return { available: true, message: 'Email looks good' };
  }

  async checkUsername(username: string): Promise<AvailabilityResult> {
    if (!/^[a-zA-Z0-9_]{3,32}$/.test(username)) {
      return {
        available: false,
        message: '3–32 chars: letters, numbers, underscore',
      };
    }
    const existing = await this.usersService.findByUsername(username);
    if (existing) {
      return { available: false, message: 'Username already taken' };
    }
    return { available: true, message: 'Username is available' };
  }

  async register(input: RegisterInput): Promise<AuthPayload> {
    const emailCheck = await this.checkEmail(input.email);
    if (!emailCheck.available) {
      throw new BadRequestException(emailCheck.message ?? 'Invalid email');
    }
    const usernameCheck = await this.checkUsername(input.username);
    if (!usernameCheck.available) {
      throw new BadRequestException(usernameCheck.message ?? 'Invalid username');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await this.usersService.create({
      email: input.email,
      username: input.username,
      passwordHash,
    });

    return this.buildAuthPayload(user);
  }

  async login(input: LoginInput): Promise<AuthPayload> {
    const user = await this.usersService.findByEmail(input.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.totpEnabled) {
      const pendingToken = this.jwtService.sign(
        { sub: user.id, email: user.email, purpose: '2fa' },
        { expiresIn: '5m' },
      );
      return {
        accessToken: null,
        user: null,
        requires2FA: true,
        pendingToken,
      };
    }

    return this.buildAuthPayload(user);
  }

  async verify2FA(pendingToken: string, code: string): Promise<AuthPayload> {
    let payload: { sub: number; purpose?: string };
    try {
      payload = this.jwtService.verify(pendingToken);
    } catch {
      throw new UnauthorizedException('2FA session expired');
    }
    if (payload.purpose !== '2fa') {
      throw new UnauthorizedException('Invalid 2FA session');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user.totpEnabled || !user.totpSecret) {
      throw new BadRequestException('2FA is not enabled for this account');
    }

    if (!this.verifyTotpCode(user.totpSecret, code, user.email)) {
      throw new UnauthorizedException('Invalid authenticator code');
    }

    return this.buildAuthPayload(user);
  }

  async beginTotpSetup(userId: number): Promise<TotpSetupPayload> {
    const user = await this.usersService.findById(userId);
    const secret = new OTPAuth.Secret({ size: 20 }).base32;
    await this.usersService.setTotpSecret(userId, secret);
    const totp = this.createTotp(secret, user.email);
    return { secret, otpauthUrl: totp.toString() };
  }

  async confirmTotp(userId: number, code: string): Promise<User> {
    const user = await this.usersService.findById(userId);
    if (!user.totpSecret) {
      throw new BadRequestException('Start 2FA setup first');
    }
    if (!this.verifyTotpCode(user.totpSecret, code, user.email)) {
      throw new UnauthorizedException('Invalid authenticator code');
    }
    return this.usersService.enableTotp(userId);
  }

  async disableTotp(userId: number, code: string): Promise<User> {
    const user = await this.usersService.findById(userId);
    if (!user.totpEnabled || !user.totpSecret) {
      throw new BadRequestException('2FA is not enabled');
    }
    if (!this.verifyTotpCode(user.totpSecret, code, user.email)) {
      throw new UnauthorizedException('Invalid authenticator code');
    }
    return this.usersService.disableTotp(userId);
  }

  async beginPasskeyRegistration(userId: number): Promise<WebAuthnOptionsPayload> {
    const user = await this.usersService.findById(userId);
    const existing = await this.securityRepository.listPasskeys(userId);

    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpID,
      userName: user.email,
      userDisplayName: user.username,
      userID: new TextEncoder().encode(String(user.id)),
      attestationType: 'none',
      excludeCredentials: existing.map((cred) => ({
        id: cred.credentialId,
        transports: (cred.transports?.split(',').filter(Boolean) ??
          []) as AuthenticatorTransport[],
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    challenges.set(`reg:${userId}`, options.challenge);
    return { optionsJson: JSON.stringify(options) };
  }

  async finishPasskeyRegistration(
    userId: number,
    responseJson: string,
  ): Promise<boolean> {
    const expectedChallenge = challenges.get(`reg:${userId}`);
    if (!expectedChallenge) {
      throw new BadRequestException('Passkey registration expired — try again');
    }

    const response = JSON.parse(responseJson) as RegistrationResponseJSON;
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new BadRequestException('Passkey registration failed');
    }

    const { credential, credentialDeviceType, credentialBackedUp } =
      verification.registrationInfo;

    await this.securityRepository.createPasskey({
      userId,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString('base64url'),
      counter: credential.counter,
      transports: credential.transports?.join(',') ?? null,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
    });

    challenges.delete(`reg:${userId}`);
    return true;
  }

  async beginPasskeyLogin(): Promise<WebAuthnOptionsPayload> {
    const options = await generateAuthenticationOptions({
      rpID: this.rpID,
      userVerification: 'preferred',
    });
    challenges.set(`login:${options.challenge}`, options.challenge);
    return { optionsJson: JSON.stringify(options) };
  }

  async finishPasskeyLogin(responseJson: string): Promise<AuthPayload> {
    const response = JSON.parse(responseJson) as AuthenticationResponseJSON;
    const cred = await this.securityRepository.findPasskeyByCredentialId(response.id);
    if (!cred) {
      throw new UnauthorizedException('Unknown passkey');
    }

    let challengeValue = '';
    try {
      const decoded = JSON.parse(
        Buffer.from(response.response.clientDataJSON, 'base64url').toString('utf8'),
      ) as { challenge: string };
      challengeValue = decoded.challenge;
    } catch {
      throw new UnauthorizedException('Invalid passkey response');
    }

    if (!challenges.has(`login:${challengeValue}`)) {
      throw new UnauthorizedException('Passkey login expired — try again');
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challengeValue,
      expectedOrigin: this.origin,
      expectedRPID: this.rpID,
      credential: {
        id: cred.credentialId,
        publicKey: Buffer.from(cred.publicKey, 'base64url'),
        counter: cred.counter,
        transports: (cred.transports?.split(',').filter(Boolean) ??
          []) as AuthenticatorTransport[],
      },
    });

    if (!verification.verified) {
      throw new UnauthorizedException('Passkey verification failed');
    }

    await this.securityRepository.updatePasskeyCounter(
      cred.id,
      verification.authenticationInfo.newCounter,
    );
    challenges.delete(`login:${challengeValue}`);

    const user = await this.usersService.findById(cred.userId);
    if (user.totpEnabled) {
      const pendingToken = this.jwtService.sign(
        { sub: user.id, email: user.email, purpose: '2fa' },
        { expiresIn: '5m' },
      );
      return {
        accessToken: null,
        user: null,
        requires2FA: true,
        pendingToken,
      };
    }

    return this.buildAuthPayload(user);
  }

  async createQrLoginSession(): Promise<QrLoginSessionPayload> {
    const sessionId = randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);
    const session = await this.securityRepository.createQrSession({
      id: sessionId,
      expiresAt,
    });
    return {
      sessionId: session.id,
      expiresAt: session.expiresAt,
      status: session.status,
      accessToken: null,
      user: null,
    };
  }

  async pollQrLoginSession(sessionId: string): Promise<QrLoginSessionPayload> {
    const session = await this.securityRepository.findQrSession(sessionId);
    if (!session) {
      throw new BadRequestException('QR session not found');
    }
    if (session.expiresAt.getTime() < Date.now() && session.status === 'pending') {
      return {
        sessionId: session.id,
        expiresAt: session.expiresAt,
        status: 'expired',
        accessToken: null,
        user: null,
      };
    }

    let user = null;
    if (session.userId) {
      const found = await this.usersService.findById(session.userId);
      user = this.toUserType(found);
    }

    return {
      sessionId: session.id,
      expiresAt: session.expiresAt,
      status: session.status,
      accessToken: session.accessToken,
      user,
    };
  }

  async approveQrLoginSession(sessionId: string, userId: number): Promise<QrLoginSessionPayload> {
    const session = await this.securityRepository.findQrSession(sessionId);
    if (!session) {
      throw new BadRequestException('QR session not found');
    }
    if (session.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('QR session expired');
    }
    if (session.status !== 'pending') {
      throw new BadRequestException('QR session already used');
    }

    const user = await this.usersService.findById(userId);
    const token = this.jwtService.sign({ sub: user.id, email: user.email });
    const updated = await this.securityRepository.approveQrSession({
      id: sessionId,
      userId,
      accessToken: token,
    });

    return {
      sessionId: updated!.id,
      expiresAt: updated!.expiresAt,
      status: updated!.status,
      accessToken: updated!.accessToken,
      user: this.toUserType(user),
    };
  }

  private buildAuthPayload(user: User): AuthPayload {
    return {
      accessToken: this.jwtService.sign({
        sub: user.id,
        email: user.email,
      }),
      user: this.toUserType(user),
      requires2FA: false,
      pendingToken: null,
    };
  }

  private toUserType(user: User) {
    return this.usersService.toUserType(user);
  }
}
