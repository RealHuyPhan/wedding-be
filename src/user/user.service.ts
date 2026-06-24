import { ConflictException, Injectable } from '@nestjs/common';
import { paginate } from '../common/utils/pagination.util';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) { }

  async create(createUserDto: CreateUserDto) {
    const { email } = createUserDto;
    const existingUser = await this.userRepository.findOne({ where: { email } })
    if (existingUser) {
      throw new ConflictException("Email already exists")
    }

    const user = this.userRepository.create(createUserDto);
    const savedUser = await this.userRepository.save(user);
    delete (savedUser as Partial<User>).password;
    return savedUser;
  }

  async findAll(pageOptionsDto: PageOptionsDto) {
    const { page = 0, size = 10, search } = pageOptionsDto;
    const queryBuilder = this.userRepository.createQueryBuilder('user');

    if (search) {
      queryBuilder.where(
        '(user.fullName ILIKE :search OR user.email ILIKE :search OR user.phone ILIKE :search)',
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

  async createGoogleUser(email: string, fullName: string) {
    const user = this.userRepository.create({ email, fullName });
    return this.userRepository.save(user);
  }

  async findOne(id: string) {
    return this.userRepository.findOne({ where: { id } });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const existingUser = await this.userRepository.findOne({ where: { id } })
    if (!existingUser) {
      throw new ConflictException("User not found")
    }

    Object.assign(existingUser, updateUserDto);
    const updatedUser = await this.userRepository.save(existingUser);
    return updatedUser;
  }

  async remove(id: string) {
    const existingUser = await this.userRepository.findOne({ where: { id } })
    if (!existingUser) {
      throw new ConflictException("User not found")
    }

    const deletedUser = await this.userRepository.delete(id);
    return deletedUser;
  }
}
