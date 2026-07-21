import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Favorite } from './entities/favorite.entity';
import { Repository } from 'typeorm';
import { CreateFavoriteDto } from './dto/create-favorite.dto';

@Injectable()
export class FavoriteService {
  constructor(
    @InjectRepository(Favorite)
    private favoriteRepository: Repository<Favorite>
  ) { }

  async getFavorites(userId: string) {
    const favorite = await this.favoriteRepository.find({
      where: { userId: userId },
      relations: {
        product: true
      },
      select: {
        id: true,
        userId: true,
        productId: true,
        createdAt: true,
        product: {
          id: true,
          product: true,
          productCode: true,
          tags: true,
          price: true,
          images: true
        }
      }
    });
    return favorite;
  }

  async addToFavorite(userId: string, createFavoriteDto: CreateFavoriteDto) {
    const existingFavorite = await this.favoriteRepository.findOne({
      where: { userId: userId, productId: createFavoriteDto.productId },
    });

    if (existingFavorite) {
      return existingFavorite;
    }

    const newFavorite = this.favoriteRepository.create({
      userId: userId,
      productId: createFavoriteDto.productId,
    });
    return this.favoriteRepository.save(newFavorite);
  }

  async removeFromFavorite(userId: string, productId: string) {
    return this.favoriteRepository.delete({ productId: productId, userId: userId });
  }

}
