import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { LoginDto } from '../common/dto/login.dto';
import type { AuthenticatedRequest } from './auth-request.interface';
import { AuthTokenGuard } from './auth-token.guard';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Post('logout')
  @UseGuards(AuthTokenGuard)
  logout(@Req() req?: AuthenticatedRequest) {
    return this.authService.logout(req?.auth as NonNullable<AuthenticatedRequest['auth']>);
  }
}