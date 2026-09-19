import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthResolver } from './auth.resolver';
import { JwtStrategy } from './jwt.strategy';
import { AuthSecurityRepository } from './auth-security.repository';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), UsersModule],
  providers: [AuthService, AuthResolver, JwtStrategy, AuthSecurityRepository],
  exports: [AuthService],
})
export class AuthModule {}
