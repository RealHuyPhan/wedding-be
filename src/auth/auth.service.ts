import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { User } from '../user/entities/user.entity';
import { CreateUserDto } from '../user/dto/create-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService
  ) { }

  async validateUser(loginDto: LoginDto): Promise<Partial<User>> {
    const user = await this.userService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Email or password is incorrect');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email or password is incorrect');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result;
  }

  login(user: Partial<User>) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(createUserDto: CreateUserDto) {
    const user = await this.userService.create(createUserDto);
    return this.login(user);
  }

  async googleLogin(req: { user: { email: string; firstName: string; lastName: string; picture?: string; accessToken?: string } }) {
    if (!req.user) {
      throw new UnauthorizedException('No user from google');
    }

    const { email, firstName, lastName } = req.user;
    const fullName = `${firstName} ${lastName}`.trim();

    let user = await this.userService.findByEmail(email);

    if (!user) {
      user = await this.userService.createGoogleUser(email, fullName);
    }

    return this.login(user);
  }
}
