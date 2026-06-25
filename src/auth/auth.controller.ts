import { Controller, Post, Body, HttpCode, HttpStatus, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../user/dto/create-user.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const validatedUser = await this.authService.validateUser(loginDto);
    const { access_token, user } = this.authService.login(validatedUser);

    return {
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      },
      access_token
    };
  }

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    const { access_token, user } = await this.authService.register(createUserDto);

    return {
      message: 'Registration successful',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      },
      access_token
    };
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  logout() {
    return { message: 'Logged out successfully' };
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Initiates the Google OAuth2 login flow
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(
    @Req() req: { user: { email: string; firstName: string; lastName: string; picture?: string; accessToken?: string } },
    @Res() res: Response
  ) {
    const { access_token } = await this.authService.googleLogin(req);

    res.redirect(`http://localhost:3000/auth/callback?status=success&token=${access_token}`);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getProfile(@Req() req: { user: { sub: string, email: string, role: string } }) {
    return this.authService.getUserProfile(req.user.sub);
  }
}
