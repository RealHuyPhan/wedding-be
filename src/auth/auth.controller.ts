import { Controller, Post, Body, HttpCode, HttpStatus, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @ApiOperation({ summary: 'Đăng nhập', description: 'Đăng nhập bằng Email và Password, trả về JWT Token' })
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

  @ApiOperation({ summary: 'Đăng ký tài khoản', description: 'Tạo tài khoản mới với quyền mặc định là user' })
  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    // Force role to 'user' to prevent privilege escalation via public API
    createUserDto.role = 'user';
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

  @ApiOperation({ summary: 'Đăng xuất', description: 'API Đăng xuất (chỉ trả về thông báo thành công)' })
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  logout() {
    return { message: 'Logged out successfully' };
  }

  @ApiOperation({ summary: 'Đăng nhập bằng Google', description: 'Chuyển hướng đến màn hình đăng nhập của Google' })
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Initiates the Google OAuth2 login flow
  }

  @ApiOperation({ summary: 'Google Callback', description: 'Xử lý callback từ Google, tự động chuyển hướng về Frontend kèm Token' })
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(
    @Req() req: { user: { email: string; firstName: string; lastName: string; picture?: string; accessToken?: string } },
    @Res() res: Response
  ) {
    const { access_token } = await this.authService.googleLogin(req);

    res.redirect(`http://localhost:3000/auth/callback?status=success&token=${access_token}`);
  }

  @ApiOperation({ summary: 'Lấy Profile', description: 'Lấy thông tin tài khoản đang đăng nhập hiện tại' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getProfile(@Req() req: { user: { sub: string, email: string, role: string } }) {
    return this.authService.getUserProfile(req.user.sub);
  }
}
