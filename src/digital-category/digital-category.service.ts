import { Injectable, NotFoundException, HttpStatus } from '@nestjs/common';
import { CreateDigitalCategoryDto } from './dto/create-digital-category.dto';
import { UpdateDigitalCategoryDto } from './dto/update-digital-category.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DigitalCategory } from './entities/digital-category.entity';
import { Repository, In } from 'typeorm';
import { PageOptionsDto } from 'src/common/dto/page-options.dto';
import { paginate } from 'src/common/utils/pagination.util';
import { generateUniqueSlug } from 'src/common/utils/slug.util';

@Injectable()
export class DigitalCategoryService {
  constructor(
    @InjectRepository(DigitalCategory)
    private readonly digitalCategoryRepository: Repository<DigitalCategory>,
  ) { }

  async create(createCategoryDto: CreateDigitalCategoryDto) {
    let categoryCode = createCategoryDto.categoryCode;

    if (!categoryCode) {
      categoryCode = await generateUniqueSlug(this.digitalCategoryRepository, createCategoryDto.category, 'categoryCode', undefined, 'category');
    } else {
      categoryCode = await generateUniqueSlug(this.digitalCategoryRepository, categoryCode, 'categoryCode', undefined, 'category');
    }

    createCategoryDto.categoryCode = categoryCode;

    const category = this.digitalCategoryRepository.create(createCategoryDto);
    await this.digitalCategoryRepository.save(category);
    return { statusCode: HttpStatus.CREATED, message: "Digital category created successfully", data: category };
  }

  async findAll(pageOptionsDto: PageOptionsDto) {
    const { page = 0, size = 10, search } = pageOptionsDto;
    const queryBuilder = this.digitalCategoryRepository.createQueryBuilder('category');

    if (search) {
      queryBuilder.where(
        '(category.category ILIKE :search or category.categoryCode ILIKE :search or category.description ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    const paginatedResult = await paginate(queryBuilder, page, size);
    return paginatedResult;
  }

  async findOne(id: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const category = isUuid
      ? await this.digitalCategoryRepository.findOne({ where: { id } })
      : await this.digitalCategoryRepository.findOne({ where: { categoryCode: id } });

    if (!category) {
      throw new NotFoundException("Digital category not found");
    }
    return category;
  }

  async findByIds(ids: string[]) {
    return await this.digitalCategoryRepository.find({ where: { id: In(ids) } });
  }

  async update(id: string, updateCategoryDto: UpdateDigitalCategoryDto) {
    const existingCategory = await this.digitalCategoryRepository.findOne({ where: { id } });
    if (!existingCategory) {
      throw new NotFoundException("Digital category not found");
    }

    if (updateCategoryDto.categoryCode) {
      updateCategoryDto.categoryCode = await generateUniqueSlug(this.digitalCategoryRepository, updateCategoryDto.categoryCode, 'categoryCode', id, 'category');
    } else if (updateCategoryDto.category && updateCategoryDto.category !== existingCategory.category) {
      updateCategoryDto.categoryCode = await generateUniqueSlug(this.digitalCategoryRepository, updateCategoryDto.category, 'categoryCode', id, 'category');
    }

    Object.assign(existingCategory, updateCategoryDto);
    await this.digitalCategoryRepository.save(existingCategory);
    return { statusCode: HttpStatus.OK, message: "Digital category updated successfully", data: existingCategory };
  }

  async remove(id: string) {
    const existingCategory = await this.digitalCategoryRepository.findOne({ where: { id } });
    if (!existingCategory) {
      throw new NotFoundException("Digital category not found");
    }
    await this.digitalCategoryRepository.remove(existingCategory);
    return { statusCode: HttpStatus.OK, message: "Digital category deleted successfully" };
  }
}
