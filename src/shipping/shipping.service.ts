import { Injectable, NotFoundException, HttpStatus } from '@nestjs/common';
import { CreateShippingDto } from './dto/create-shipping.dto';
import { UpdateShippingDto } from './dto/update-shipping.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ShippingDestination } from './entities/shipping.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ShippingService {
  constructor(
    @InjectRepository(ShippingDestination)
    private shippingRepository: Repository<ShippingDestination>,
  ) { }

  async create(createShippingDto: CreateShippingDto) {
    const newDest = this.shippingRepository.create(createShippingDto);
    await this.shippingRepository.save(newDest);
    return { statusCode: HttpStatus.CREATED, message: "Shipping zone created successfully" };
  }

  findAll() {
    return this.shippingRepository.find({ order: { country: 'ASC', province: 'ASC' } });
  }

  async findOne(id: string) {
    const dest = await this.shippingRepository.findOne({ where: { id } });
    if (!dest) throw new NotFoundException('Shipping destination not found');
    return dest;
  }

  async update(id: string, updateShippingDto: UpdateShippingDto) {
    const dest = await this.findOne(id);
    const updated = Object.assign(dest, updateShippingDto);
    await this.shippingRepository.save(updated);
    return { statusCode: HttpStatus.OK, message: "Shipping zone updated successfully" };
  }

  async remove(id: string) {
    const dest = await this.findOne(id);
    await this.shippingRepository.remove(dest);
    return { statusCode: HttpStatus.OK, message: "Shipping zone deleted successfully" };
  }
}
