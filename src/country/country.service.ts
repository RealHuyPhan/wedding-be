import { Injectable, NotFoundException, ConflictException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Country } from './entities/country.entity';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';

@Injectable()
export class CountryService {
  constructor(
    @InjectRepository(Country)
    private readonly countryRepository: Repository<Country>,
  ) {}

  async create(createCountryDto: CreateCountryDto) {
    // Normalize code to uppercase
    createCountryDto.code = createCountryDto.code.toUpperCase();

    const existing = await this.countryRepository.findOne({
      where: { code: createCountryDto.code },
    });
    if (existing) {
      throw new ConflictException(`Country with code "${createCountryDto.code}" already exists`);
    }

    const country = this.countryRepository.create(createCountryDto);
    await this.countryRepository.save(country);
    return { statusCode: HttpStatus.CREATED, message: 'Country created successfully' };
  }

  async findAll() {
    return this.countryRepository.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string) {
    const country = await this.countryRepository.findOne({ where: { id } });
    if (!country) {
      throw new NotFoundException('Country not found');
    }
    return country;
  }

  async update(id: string, updateCountryDto: UpdateCountryDto) {
    const country = await this.findOne(id);

    if (updateCountryDto.code) {
      updateCountryDto.code = updateCountryDto.code.toUpperCase();
    }

    Object.assign(country, updateCountryDto);
    await this.countryRepository.save(country);
    return { statusCode: HttpStatus.OK, message: 'Country updated successfully' };
  }

  async remove(id: string) {
    const country = await this.findOne(id);
    await this.countryRepository.remove(country);
    return { statusCode: HttpStatus.OK, message: 'Country deleted successfully' };
  }
}
