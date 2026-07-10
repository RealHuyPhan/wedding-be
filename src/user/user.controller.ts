import { Controller, Get, Post, Body, Param, Delete, UseGuards, Patch, Request, Query } from '@nestjs/common';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @ApiOperation({ summary: '[Admin] Create user', description: 'Create a new user account (Admin only)' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @ApiOperation({ summary: '[Admin] Get users list', description: 'Supports pagination and search (Admin only)' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get()
  findAll(@Query() pageOptionsDto: PageOptionsDto) {
    return this.userService.findAll(pageOptionsDto);
  }

  @ApiOperation({ summary: '[Admin] Get user details', description: 'View user details by ID (Admin only)' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @ApiOperation({ summary: 'Update account', description: 'User can update their own profile, or Admin can update any user' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'user')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Request() req: { user: { sub: string, role: string } }) {
    return this.userService.update(id, updateUserDto, req.user);
  }

  @ApiOperation({ summary: '[Admin] Delete user', description: 'Delete account by ID (Admin only)' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
