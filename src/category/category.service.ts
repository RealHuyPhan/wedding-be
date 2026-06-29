import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { Repository, In } from 'typeorm';
import { PageOptionsDto } from 'src/common/dto/page-options.dto';
import { paginate } from 'src/common/utils/pagination.util';
import { toCamelCase } from 'src/common/utils/string.util';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) { }


  async create(createCategoryDto: CreateCategoryDto) {
    // Tự động sinh mã 'value' từ 'label'
    const value = toCamelCase(createCategoryDto.label);

    // Kiểm tra xem danh mục này đã tồn tại chưa (dựa theo mã value)
    const existingCategory = await this.categoryRepository.findOne({ where: { value } });
    if (existingCategory) {
      throw new ConflictException("Category already exists");
    }

    // Tạo và lưu danh mục vào cơ sở dữ liệu
    const category = this.categoryRepository.create({ ...createCategoryDto, value });
    const savedCategory = await this.categoryRepository.save(category);
    return { message: "Category created successfully", id: savedCategory.id };
  }

  async findAll(pageOptionsDto: PageOptionsDto) {
    const { page = 0, size = 10, search } = pageOptionsDto;
    const queryBuilder = this.categoryRepository.createQueryBuilder('category');

    if (search) {
      queryBuilder.where(
        '(category.label ILIKE :search or category.value ILIKE :search or category.description ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    const paginatedResult = await paginate(queryBuilder, page, size);

    return paginatedResult;
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
    // Tìm danh mục cần cập nhật
    const existingCategory = await this.categoryRepository.findOne({ where: { id } })
    if (!existingCategory) {
      throw new NotFoundException("Category not found")
    }

    // Nếu có sửa tên (label) thì phải cập nhật lại mã (value) tương ứng
    if (updateCategoryDto.label) {
      existingCategory.value = toCamelCase(updateCategoryDto.label);
    }

    // Nạp dữ liệu mới vào entity (những trường không gửi lên sẽ giữ nguyên giá trị cũ)
    Object.assign(existingCategory, updateCategoryDto);

    await this.categoryRepository.save(existingCategory);
    return { message: "Category updated successfully" };
  }

  async remove(id: string) {
    const existingCategory = await this.categoryRepository.findOne({ where: { id } })
    if (!existingCategory) {
      throw new NotFoundException("Category not found")
    }
    await this.categoryRepository.remove(existingCategory);
    return { message: "Category deleted successfully" };
  }
}
