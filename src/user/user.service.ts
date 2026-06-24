import { ConflictException, Injectable } from '@nestjs/common';
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

  async findAll(page: number, size: number, search?: string) {
    const queryBuilder = this.userRepository.createQueryBuilder('user');

    if (search) {
      queryBuilder.where(
        '(user.fullName ILIKE :search OR user.email ILIKE :search OR user.phone ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    queryBuilder.skip(page * size).take(size);

    const [users, totalElements] = await queryBuilder.getManyAndCount();

    const items = users.map(user => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    });

    const totalPages = Math.ceil(totalElements / size);

    return {
      items,
      page: {
        number: page,
        size: size,
        totalElements: totalElements,
        totalPages: totalPages,
        first: page === 0,
        last: page >= totalPages - 1 || totalElements === 0,
      }
    };
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
