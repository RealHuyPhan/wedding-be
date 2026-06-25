import { ConflictException, Injectable } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { Repository, In } from 'typeorm';
import { PageOptionsDto } from 'src/common/dto/page-options.dto';
import { paginate } from 'src/common/utils/pagination.util';

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

  async findAll(pageOptionsDto: PageOptionsDto) {
    const { page = 0, size = 10, search } = pageOptionsDto;
    const queryBuilder = this.categoryRepository.createQueryBuilder('category');

    if (search) {
      queryBuilder.where(
        '(category.name ILIKE :search or category.description ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    const paginatedResult = await paginate(queryBuilder, page, size);

    return paginatedResult;
  }

  async findOne(id: string) {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new ConflictException("Category not found");
    }
    return category;
  }

  async findByIds(ids: string[]) {
    return await this.categoryRepository.find({ where: { id: In(ids) } });
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
