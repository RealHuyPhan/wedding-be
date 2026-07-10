import { Controller, Get, Post, Body, Param, Delete, UseGuards, Patch, Request, ForbiddenException, Query } from '@nestjs/common';
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

  @ApiOperation({ summary: '[Admin] Tạo người dùng', description: 'Tạo tài khoản người dùng mới (Chỉ Admin)' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @ApiOperation({ summary: '[Admin] Lấy danh sách người dùng', description: 'Hỗ trợ phân trang và tìm kiếm (Chỉ Admin)' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get()
  findAll(@Query() pageOptionsDto: PageOptionsDto) {
    return this.userService.findAll(pageOptionsDto);
  }

  @ApiOperation({ summary: '[Admin] Lấy chi tiết người dùng', description: 'Xem chi tiết 1 người dùng theo ID (Chỉ Admin)' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @ApiOperation({ summary: 'Cập nhật tài khoản', description: 'Người dùng tự cập nhật thông tin của mình, hoặc Admin cập nhật thông tin bất kỳ ai' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'user')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Request() req: { user: { sub: string, role: string } }) {
    const currentUser = req.user;

    // Only current user or admin can update profile
    if (currentUser.role !== 'admin' && currentUser.sub !== id) {
      throw new ForbiddenException('You are not allowed to update other users');
    }

    // Prevent regular users from elevating their own privileges
    if (currentUser.role !== 'admin' && updateUserDto.role) {
      delete updateUserDto.role;
    }

    return this.userService.update(id, updateUserDto);
  }

  @ApiOperation({ summary: '[Admin] Xóa người dùng', description: 'Xóa tài khoản theo ID (Chỉ Admin)' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
