import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  AuthPayload,
  AvailabilityResult,
  TotpSetupPayload,
  WebAuthnOptionsPayload,
  QrLoginSessionPayload,
} from './auth.type';
import {
  RegisterInput,
  LoginInput,
  Verify2FAInput,
  ConfirmTotpInput,
  PasskeyResponseInput,
  ApproveQrLoginInput,
} from './auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { User } from '../database/schema';
import { UserType } from '../users/user.type';
import { UsersService } from '../users/users.service';

@Resolver()
export class AuthResolver {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Query(() => AvailabilityResult)
  checkEmail(@Args('email') email: string): Promise<AvailabilityResult> {
    return this.authService.checkEmail(email);
  }

  @Query(() => AvailabilityResult)
  checkUsername(@Args('username') username: string): Promise<AvailabilityResult> {
    return this.authService.checkUsername(username);
  }

  @Mutation(() => AuthPayload)
  register(@Args('input') input: RegisterInput): Promise<AuthPayload> {
    return this.authService.register(input);
  }

  @Mutation(() => AuthPayload)
  login(@Args('input') input: LoginInput): Promise<AuthPayload> {
    return this.authService.login(input);
  }

  @Mutation(() => AuthPayload)
  verify2FA(@Args('input') input: Verify2FAInput): Promise<AuthPayload> {
    return this.authService.verify2FA(input.pendingToken, input.code);
  }

  @Mutation(() => TotpSetupPayload)
  @UseGuards(JwtAuthGuard)
  beginTotpSetup(@CurrentUser() user: User): Promise<TotpSetupPayload> {
    return this.authService.beginTotpSetup(user.id);
  }

  @Mutation(() => UserType)
  @UseGuards(JwtAuthGuard)
  async confirmTotp(
    @Args('input') input: ConfirmTotpInput,
    @CurrentUser() user: User,
  ): Promise<UserType> {
    const updated = await this.authService.confirmTotp(user.id, input.code);
    return this.usersService.toUserType(updated);
  }

  @Mutation(() => UserType)
  @UseGuards(JwtAuthGuard)
  async disableTotp(
    @Args('input') input: ConfirmTotpInput,
    @CurrentUser() user: User,
  ): Promise<UserType> {
    const updated = await this.authService.disableTotp(user.id, input.code);
    return this.usersService.toUserType(updated);
  }

  @Mutation(() => WebAuthnOptionsPayload)
  @UseGuards(JwtAuthGuard)
  beginPasskeyRegistration(@CurrentUser() user: User): Promise<WebAuthnOptionsPayload> {
    return this.authService.beginPasskeyRegistration(user.id);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  finishPasskeyRegistration(
    @Args('input') input: PasskeyResponseInput,
    @CurrentUser() user: User,
  ): Promise<boolean> {
    return this.authService.finishPasskeyRegistration(user.id, input.responseJson);
  }

  @Mutation(() => WebAuthnOptionsPayload)
  beginPasskeyLogin(): Promise<WebAuthnOptionsPayload> {
    return this.authService.beginPasskeyLogin();
  }

  @Mutation(() => AuthPayload)
  finishPasskeyLogin(@Args('input') input: PasskeyResponseInput): Promise<AuthPayload> {
    return this.authService.finishPasskeyLogin(input.responseJson);
  }

  @Mutation(() => QrLoginSessionPayload)
  createQrLoginSession(): Promise<QrLoginSessionPayload> {
    return this.authService.createQrLoginSession();
  }

  @Query(() => QrLoginSessionPayload)
  qrLoginSession(@Args('sessionId') sessionId: string): Promise<QrLoginSessionPayload> {
    return this.authService.pollQrLoginSession(sessionId);
  }

  @Mutation(() => QrLoginSessionPayload)
  @UseGuards(JwtAuthGuard)
  approveQrLogin(
    @Args('input') input: ApproveQrLoginInput,
    @CurrentUser() user: User,
  ): Promise<QrLoginSessionPayload> {
    return this.authService.approveQrLoginSession(input.sessionId, user.id);
  }
}
