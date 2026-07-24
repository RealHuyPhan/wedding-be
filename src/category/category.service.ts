import { Injectable, NotFoundException, HttpStatus } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { Repository, In } from 'typeorm';
import { PageOptionsDto } from 'src/common/dto/page-options.dto';
import { paginate } from 'src/common/utils/pagination.util';
import { generateUniqueSlug } from 'src/common/utils/slug.util';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) { }

  async create(createCategoryDto: CreateCategoryDto) {
    let categoryCode = createCategoryDto.categoryCode;

    // Nếu frontend không truyền categoryCode hoặc ta muốn ghi đè, tự động sinh từ tên
    if (!categoryCode) {
      categoryCode = await generateUniqueSlug(this.categoryRepository, createCategoryDto.category, 'categoryCode', undefined, 'category');
    } else {
      // Nếu có truyền, đảm bảo format chuẩn slug và duy nhất
      categoryCode = await generateUniqueSlug(this.categoryRepository, categoryCode, 'categoryCode', undefined, 'category');
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
      updateCategoryDto.categoryCode = await generateUniqueSlug(this.categoryRepository, updateCategoryDto.categoryCode, 'categoryCode', id, 'category');
    } else if (updateCategoryDto.category && updateCategoryDto.category !== existingCategory.category) {
      // Tùy chọn: Nếu sửa tên mà không truyền mã, có thể tự cập nhật mã theo tên mới
      updateCategoryDto.categoryCode = await generateUniqueSlug(this.categoryRepository, updateCategoryDto.category, 'categoryCode', id, 'category');
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
