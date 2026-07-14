import { Injectable, BadRequestException, NotFoundException, HttpStatus } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CategoryService } from 'src/category/category.service';
import { PageOptionsDto } from 'src/common/dto/page-options.dto';
import { paginate } from 'src/common/utils/pagination.util';
import slugify from 'slugify';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private categoryService: CategoryService,
  ) { }

  private async generateUniqueCode(name: string, excludeId?: string): Promise<string> {
    const baseSlug = slugify(name, { lower: true, strict: true, locale: 'vi' });
    let code = baseSlug || 'product';
    let counter = 1;

    while (true) {
      const query = this.productRepository.createQueryBuilder('product')
        .where('product.productCode = :code', { code });

      if (excludeId) {
        query.andWhere('product.id != :id', { id: excludeId });
      }

      const exists = await query.getOne();
      if (!exists) {
        return code;
      }
      code = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  async create(createProductDto: CreateProductDto) {
    const { categoryIds, categoryId, ...productData } = createProductDto;

    let productCode = productData.productCode;

    if (!productCode) {
      productCode = await this.generateUniqueCode(productData.product);
    } else {
      productCode = slugify(productCode, { lower: true, strict: true, locale: 'vi' });
      productCode = await this.generateUniqueCode(productCode);
    }

    productData.productCode = productCode;

    const product = this.productRepository.create(productData);

    const finalCategoryIds = categoryIds || (categoryId ? [categoryId] : []);

    if (finalCategoryIds.length > 0) {
      const foundCategories = await this.categoryService.findByIds(finalCategoryIds);
      if (foundCategories.length !== finalCategoryIds.length) {
        throw new BadRequestException('Category not found');
      }
      product.categories = foundCategories;
    }

    await this.productRepository.save(product);
    return { statusCode: HttpStatus.CREATED, message: "Product created successfully" };
  }

  async findAll(pageOptionsDto: PageOptionsDto) {
    const { page = 0, size = 10, search, categoryId } = pageOptionsDto;
    const queryBuilder = this.productRepository.createQueryBuilder('product');

    queryBuilder.leftJoinAndSelect('product.categories', 'category');

    if (search) {
      queryBuilder.where(
        '(product.product ILIKE :search or product.productCode ILIKE :search or product.description ILIKE :search or product.tags ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (categoryId) {
      queryBuilder.andWhere('category.id = :categoryId', { categoryId });
    }

    const paginatedResult = await paginate(queryBuilder, page, size);

    return paginatedResult;
  }

  async findBestSeller() {
    const hotItem = await this.productRepository.find({
      where: { isHotItem: true },
      take: 4,
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

    if (productData.productCode) {
      const newCode = slugify(productData.productCode, { lower: true, strict: true, locale: 'vi' });
      productData.productCode = await this.generateUniqueCode(newCode, id);
    }

    Object.assign(existingProduct, productData);

    let finalCategoryIds: string[] | undefined = undefined;
    if (categoryIds !== undefined) {
      finalCategoryIds = categoryIds;
    } else if (categoryId !== undefined) {
      finalCategoryIds = categoryId ? [categoryId] : [];
    }

    if (finalCategoryIds !== undefined) {
      if (finalCategoryIds.length === 0) {
        existingProduct.categories = [];
      } else {
        const foundCategories = await this.categoryService.findByIds(finalCategoryIds);
        if (foundCategories.length !== finalCategoryIds.length) {
          throw new BadRequestException('Category not found');
        }
        existingProduct.categories = foundCategories;
      }
    }

    await this.productRepository.save(existingProduct);
    return { statusCode: HttpStatus.OK, message: "Product updated successfully" };
  }

  async remove(id: string) {
    const existingProduct = await this.productRepository.findOne({ where: { id } })
    if (!existingProduct) {
      throw new NotFoundException("Product not found")
    }
    await this.productRepository.remove(existingProduct);
    return { statusCode: HttpStatus.OK, message: "Product deleted successfully" };
  }
}
