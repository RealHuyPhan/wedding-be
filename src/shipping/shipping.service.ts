import { Injectable, NotFoundException } from '@nestjs/common';
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

  create(createShippingDto: CreateShippingDto) {
    const newDest = this.shippingRepository.create(createShippingDto);
    return this.shippingRepository.save(newDest);
  }

  findAll() {
    return this.shippingRepository.find({ order: { country: 'ASC', province: 'ASC' } });
  }

  findActive() {
    return this.shippingRepository.find({
      where: { isActive: true },
      order: { country: 'ASC', province: 'ASC' }
    });
  }

  async findOne(id: string) {
    const dest = await this.shippingRepository.findOne({ where: { id } });
    if (!dest) throw new NotFoundException('Shipping destination not found');
    return dest;
  }

  async update(id: string, updateShippingDto: UpdateShippingDto) {
    const dest = await this.findOne(id);
    const updated = Object.assign(dest, updateShippingDto);
    return this.shippingRepository.save(updated);
  }

  async remove(id: string) {
    const dest = await this.findOne(id);
    return this.shippingRepository.remove(dest);
  }
}
