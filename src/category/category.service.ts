import { ConflictException, Injectable } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { Repository, ILike } from 'typeorm';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) { }


  async create(createCategoryDto: CreateCategoryDto) {
    const category = this.categoryRepository.create(createCategoryDto);
    return await this.categoryRepository.save(category);
  }

  async findAll(name?: string) {
    const whereCondition = name ? { name: ILike(`%${name}%`) } : {};
    const categories = await this.categoryRepository.find({ where: whereCondition });
    return categories;
  }

  async findOne(id: string) {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new ConflictException("Category not found");
    }
    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const existingCategory = await this.categoryRepository.findOne({ where: { id } })
    if (!existingCategory) {
      throw new ConflictException("Category not found")
    }
    Object.assign(existingCategory, updateCategoryDto);
    const updateCategory = await this.categoryRepository.save(existingCategory);
    return updateCategory
  }

  async remove(id: string) {
    const existingCategory = await this.categoryRepository.findOne({ where: { id } })
    if (!existingCategory) {
      throw new ConflictException("Category not found")
    }
    const deleteCategory = await this.categoryRepository.delete(id);
    return deleteCategory
  }
}
