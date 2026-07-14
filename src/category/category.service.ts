import { Injectable, NotFoundException, HttpStatus } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { Repository, In } from 'typeorm';
import { PageOptionsDto } from 'src/common/dto/page-options.dto';
import { paginate } from 'src/common/utils/pagination.util';
import slugify from 'slugify';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) { }

  private async generateUniqueCode(name: string, excludeId?: string): Promise<string> {
    const baseSlug = slugify(name, { lower: true, strict: true, locale: 'vi' });
    let code = baseSlug || 'category';
    let counter = 1;

    while (true) {
      const query = this.categoryRepository.createQueryBuilder('category')
        .where('category.categoryCode = :code', { code });

      if (excludeId) {
        query.andWhere('category.id != :id', { id: excludeId });
      }

      const exists = await query.getOne();
      if (!exists) {
        return code;
      }
      code = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  async create(createCategoryDto: CreateCategoryDto) {
    let categoryCode = createCategoryDto.categoryCode;

    // Nếu frontend không truyền categoryCode hoặc ta muốn ghi đè, tự động sinh từ tên
    if (!categoryCode) {
      categoryCode = await this.generateUniqueCode(createCategoryDto.category);
    } else {
      // Nếu có truyền, đảm bảo format chuẩn slug và duy nhất
      categoryCode = slugify(categoryCode, { lower: true, strict: true, locale: 'vi' });
      categoryCode = await this.generateUniqueCode(categoryCode);
    }

    createCategoryDto.categoryCode = categoryCode;

    const category = this.categoryRepository.create(createCategoryDto);
    await this.categoryRepository.save(category);
    return { statusCode: HttpStatus.CREATED, message: "Category created successfully" };
  }

  async findAll(pageOptionsDto: PageOptionsDto) {
    const { page = 0, size = 10, search } = pageOptionsDto;
    const queryBuilder = this.categoryRepository.createQueryBuilder('category');

    if (search) {
      queryBuilder.where(
        '(category.category ILIKE :search or category.categoryCode ILIKE :search or category.description ILIKE :search)',
        { search: `%${search}%` }
      );
    }


    const paginatedResult = await paginate(queryBuilder, page, size);

    return paginatedResult;
  }

  async categoryHomePage() {
    const categoryList = await this.categoryRepository.find({
      take: 8
    })
    return {
      data: categoryList
    }
  }


  async findOne(id: string) {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException("Category not found");
    }
    return category;
  }

  async findByIds(ids: string[]) {
    return await this.categoryRepository.find({ where: { id: In(ids) } });
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const existingCategory = await this.categoryRepository.findOne({ where: { id } })
    if (!existingCategory) {
      throw new NotFoundException("Category not found")
    }

    if (updateCategoryDto.categoryCode) {
      // Nếu có sửa mã thì slugify và kiểm tra trùng lặp
      const newCode = slugify(updateCategoryDto.categoryCode, { lower: true, strict: true, locale: 'vi' });
      updateCategoryDto.categoryCode = await this.generateUniqueCode(newCode, id);
    } else if (updateCategoryDto.category && updateCategoryDto.category !== existingCategory.category) {
      // Tùy chọn: Nếu sửa tên mà không truyền mã, có thể tự cập nhật mã theo tên mới
      // updateCategoryDto.categoryCode = await this.generateUniqueCode(updateCategoryDto.category, id);
    }

    Object.assign(existingCategory, updateCategoryDto);

    await this.categoryRepository.save(existingCategory);
    return { statusCode: HttpStatus.OK, message: "Category updated successfully" };
  }

  async remove(id: string) {
    const existingCategory = await this.categoryRepository.findOne({ where: { id } })
    if (!existingCategory) {
      throw new NotFoundException("Category not found")
    }
    await this.categoryRepository.remove(existingCategory);
    return { statusCode: HttpStatus.OK, message: "Category deleted successfully" };
  }
}
