import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CategoryService } from 'src/category/category.service';
import { PageOptionsDto } from 'src/common/dto/page-options.dto';
import { paginate } from 'src/common/utils/pagination.util';
import { toSlug } from 'src/common/utils/string.util';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private categoryService: CategoryService,
  ) { }
  async create(createProductDto: CreateProductDto) {
    // Tách riêng thông tin danh mục (category) ra khỏi dữ liệu sản phẩm
    const { categoryIds, categoryId, ...productData } = createProductDto;

    // Tự động sinh mã 'value' dựa trên 'label' do người dùng nhập
    const value = toSlug(productData.label);
    const product = this.productRepository.create({ ...productData, value });

    // Hỗ trợ linh hoạt: form có thể gửi lên mảng (categoryIds) hoặc chuỗi đơn (categoryId)
    const finalCategoryIds = categoryIds || (categoryId ? [categoryId] : []);

    // Nếu có chọn danh mục, tiến hành kiểm tra xem danh mục có tồn tại trong DB không
    if (finalCategoryIds.length > 0) {
      const foundCategories = await this.categoryService.findByIds(finalCategoryIds);
      if (foundCategories.length !== finalCategoryIds.length) {
        throw new BadRequestException('Category not found');
      }
      // Gắn danh mục vào sản phẩm trước khi lưu
      product.categories = foundCategories;
    }

    const savedProduct = await this.productRepository.save(product);
    return { message: "Product created successfully", id: savedProduct.id };
  }

  async findAll(pageOptionsDto: PageOptionsDto) {
    const { page = 0, size = 10, search } = pageOptionsDto;
    const queryBuilder = this.productRepository.createQueryBuilder('product');

    queryBuilder.leftJoinAndSelect('product.categories', 'category');

    if (search) {
      queryBuilder.where(
        '(product.label ILIKE :search or product.value ILIKE :search or product.description ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    const paginatedResult = await paginate(queryBuilder, page, size);

    return paginatedResult;
  }

  async findBestSeller() {
    const hotItem = await this.productRepository.find({
      where: { isHotItem: true },
      take: 4,
      // relation muốn lấy thêm ra category thì true
      relations: { categories: false },
    });
    return {
      data: hotItem,
    }
  }

  async findOne(id: string) {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: { categories: true }
    })
    if (!product) {
      throw new NotFoundException("Product not found")
    }
    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const existingProduct = await this.productRepository.findOne({
      where: { id },
      relations: { categories: true }
    })
    if (!existingProduct) {
      throw new NotFoundException("Product not found")
    }

    const { categoryIds, categoryId, ...productData } = updateProductDto;

    // Nếu có cập nhật tên (label), tiến hành cập nhật lại mã (value) tương ứng
    if (productData.label) {
      existingProduct.value = toSlug(productData.label);
    }

    // Đổ dữ liệu mới vào entity hiện tại (những trường không gửi lên sẽ được giữ nguyên)
    Object.assign(existingProduct, productData);

    // Xác định danh sách ID danh mục cần cập nhật
    // Ưu tiên mảng categoryIds nếu có, nếu không thì dùng categoryId
    let finalCategoryIds: string[] | undefined = undefined;
    if (categoryIds !== undefined) {
      finalCategoryIds = categoryIds;
    } else if (categoryId !== undefined) {
      finalCategoryIds = categoryId ? [categoryId] : [];
    }

    // Nếu người dùng có gửi thông tin thay đổi danh mục (không bị undefined)
    if (finalCategoryIds !== undefined) {
      if (finalCategoryIds.length === 0) {
        // Trường hợp người dùng bỏ chọn tất cả danh mục
        existingProduct.categories = [];
      } else {
        // Tìm và liên kết với các danh mục mới
        const foundCategories = await this.categoryService.findByIds(finalCategoryIds);
        if (foundCategories.length !== finalCategoryIds.length) {
          throw new BadRequestException('Category not found');
        }
        existingProduct.categories = foundCategories;
      }
    }

    await this.productRepository.save(existingProduct);
    return { message: "Product updated successfully" };
  }

  async remove(id: string) {
    const existingProduct = await this.productRepository.findOne({ where: { id } })
    if (!existingProduct) {
      throw new NotFoundException("Product not found")
    }
    await this.productRepository.remove(existingProduct);
    return { message: "Product deleted successfully" };
  }
}
