import { ConflictException, Injectable, NotFoundException, ForbiddenException, HttpStatus } from '@nestjs/common';
import { paginate } from '../common/utils/pagination.util';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository, Not } from 'typeorm';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) { }

  async create(createUserDto: CreateUserDto) {
    const { email, phone } = createUserDto;
    const existingUser = await this.userRepository.findOne({ where: { email } })
    if (existingUser) {
      throw new ConflictException("Email already exists")
    }

    if (phone) {
      const existingPhone = await this.userRepository.findOne({ where: { phone } })
      if (existingPhone) {
        throw new ConflictException("Phone number already exists")
      }
    }

    const user = this.userRepository.create(createUserDto);

    await this.userRepository.save(user);
    return { statusCode: HttpStatus.CREATED, message: "User created successfully" };
  }

  async findAll(pageOptionsDto: PageOptionsDto) {
    const { page = 0, size = 10, search } = pageOptionsDto;
    const queryBuilder = this.userRepository.createQueryBuilder('user');

    if (search) {
      queryBuilder.where(
        '(user.name ILIKE :search OR user.email ILIKE :search OR user.phone ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    const paginatedResult = await paginate(queryBuilder, page, size);

    paginatedResult.items = paginatedResult.items.map(user => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result as User;
    });

    return paginatedResult;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async createGoogleUser(email: string, name: string) {
    const user = this.userRepository.create({ email, name, provider: 'google' });
    const savedUser = await this.userRepository.save(user);
    delete (savedUser as Partial<User>).password;
    return savedUser;
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    delete (user as Partial<User>).password;
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto, currentUser: { sub: string, role: string }) {
    // Only current user or admin can update profile
    if (currentUser.role !== 'admin' && currentUser.sub !== id) {
      throw new ForbiddenException('You are not allowed to update other users');
    }

    // Prevent regular users from elevating their own privileges
    if (currentUser.role !== 'admin' && updateUserDto.role) {
      delete updateUserDto.role;
    }

    const existingUser = await this.userRepository.findOne({ where: { id } })
    if (!existingUser) {
      throw new NotFoundException("User not found")
    }

    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const emailExists = await this.userRepository.findOne({ where: { email: updateUserDto.email, id: Not(id) } });
      if (emailExists) {
        throw new ConflictException("Email already exists");
      }
    }

    if (updateUserDto.phone && updateUserDto.phone !== existingUser.phone) {
      const phoneExists = await this.userRepository.findOne({ where: { phone: updateUserDto.phone, id: Not(id) } });
      if (phoneExists) {
        throw new ConflictException("Phone number already exists");
      }
    }

    Object.assign(existingUser, updateUserDto);
    await this.userRepository.save(existingUser);
    return { statusCode: HttpStatus.OK, message: "User updated successfully" };
  }

  async remove(id: string) {
    const existingUser = await this.userRepository.findOne({ where: { id } })
    if (!existingUser) {
      throw new NotFoundException("User not found")
    }
    await this.userRepository.remove(existingUser);
    return { statusCode: HttpStatus.OK, message: "User deleted successfully" };
  }
}
