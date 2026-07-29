import { Injectable, NotFoundException, ConflictException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { State } from './entities/state.entity';
import { CreateStateDto } from './dto/create-state.dto';
import { UpdateStateDto } from './dto/update-state.dto';
import { Country } from '../country/entities/country.entity';

@Injectable()
export class StateService {
  constructor(
    @InjectRepository(State)
    private readonly stateRepository: Repository<State>,
    @InjectRepository(Country)
    private readonly countryRepository: Repository<Country>,
  ) {}

  async create(createStateDto: CreateStateDto) {
    // Normalize codes to uppercase
    createStateDto.code = createStateDto.code.toUpperCase();
    createStateDto.countryCode = createStateDto.countryCode.toUpperCase();

    // Validate that the country exists
    const country = await this.countryRepository.findOne({
      where: { code: createStateDto.countryCode },
    });
    if (!country) {
      throw new NotFoundException(`Country with code "${createStateDto.countryCode}" not found`);
    }

    // Check for duplicate state within the same country
    const existing = await this.stateRepository.findOne({
      where: { code: createStateDto.code, countryCode: createStateDto.countryCode },
    });
    if (existing) {
      throw new ConflictException(`State "${createStateDto.code}" already exists in country "${createStateDto.countryCode}"`);
    }

    const state = this.stateRepository.create(createStateDto);
    await this.stateRepository.save(state);
    return { statusCode: HttpStatus.CREATED, message: 'State created successfully' };
  }

  async findAll(countryCode?: string) {
    const where: Record<string, string> = {};
    if (countryCode) {
      where.countryCode = countryCode.toUpperCase();
    }
    return this.stateRepository.find({ where, order: { name: 'ASC' } });
  }

  async findOne(id: string) {
    const state = await this.stateRepository.findOne({ where: { id }, relations: { country: true } });
    if (!state) {
      throw new NotFoundException('State not found');
    }
    return state;
  }

  async update(id: string, updateStateDto: UpdateStateDto) {
    const state = await this.findOne(id);

    if (updateStateDto.code) {
      updateStateDto.code = updateStateDto.code.toUpperCase();
    }
    if (updateStateDto.countryCode) {
      updateStateDto.countryCode = updateStateDto.countryCode.toUpperCase();

      // Validate the new country exists
      const country = await this.countryRepository.findOne({
        where: { code: updateStateDto.countryCode },
      });
      if (!country) {
        throw new NotFoundException(`Country with code "${updateStateDto.countryCode}" not found`);
      }
    }

    Object.assign(state, updateStateDto);
    await this.stateRepository.save(state);
    return { statusCode: HttpStatus.OK, message: 'State updated successfully' };
  }

  async remove(id: string) {
    const state = await this.findOne(id);
    await this.stateRepository.remove(state);
    return { statusCode: HttpStatus.OK, message: 'State deleted successfully' };
  }
}
