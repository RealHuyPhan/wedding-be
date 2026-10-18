import { Injectable, BadRequestException, NotFoundException, HttpStatus, OnModuleInit, Logger } from '@nestjs/common';
import { CreateDigitalProductDto } from './dto/create-digital-product.dto';
import { UpdateDigitalProductDto } from './dto/update-digital-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DigitalProduct } from './entities/digital-product.entity';
import { DigitalCategoryService } from 'src/digital-category/digital-category.service';
import { PageOptionsDto } from 'src/common/dto/page-options.dto';
import { paginate } from 'src/common/utils/pagination.util';
import slugify from 'slugify';

@Injectable()
export class DigitalProductService implements OnModuleInit {
  private readonly logger = new Logger(DigitalProductService.name);

  constructor(
    @InjectRepository(DigitalProduct)
    private readonly digitalProductRepository: Repository<DigitalProduct>,
    private readonly digitalCategoryService: DigitalCategoryService,
  ) { }

  async onModuleInit() {
    await this.seedInitialData();
  }

  private async seedInitialData() {
    try {
      const count = await this.digitalProductRepository.count();
      if (count > 0) return;

      this.logger.log('Seeding initial digital categories and products...');

      const cat1 = await this.digitalCategoryService.create({
        category: 'Minimalist Editorial',
        description: 'Phong cách tối giản, bố cục tạp chí hiện đại và sang trọng.',
      });

      const cat2 = await this.digitalCategoryService.create({
        category: 'Romantic Botanical',
        description: 'Họa tiết hoa lá nước lãng mạn, nhẹ nhàng và thanh lịch.',
      });

      const cat3 = await this.digitalCategoryService.create({
        category: 'Modern Luxury',
        description: 'Đẳng cấp hiện đại với gam màu quý phái và monogram tinh tế.',
      });

      await this.create({
        product: 'The Celestial Digital Suite',
        description: 'Mẫu thiệp cưới online tương tác cao cấp với hiệu ứng sao trời, đếm ngược ngày cưới và nhạc nền piano du dương.',
        tags: 'digital, online, modern, celestial',
        price: 250000,
        images: [{ url: '/images/hero.png', isCover: true }],
        previewUrl: '/checkout/invitation',
        templateId: 'template-01',
        isHotItem: true,
        categoryIds: cat1.data?.id ? [cat1.data.id] : [],
      });

      await this.create({
        product: 'Blush Botanical Digital Invite',
        description: 'Thiệp cưới điện tử phong cách hoa hồng pastel nhẹ nhàng, tích hợp bản đồ Google Maps và RSVP xác nhận tham dự tức thì.',
        tags: 'digital, online, floral, botanical',
        price: 280000,
        images: [{ url: '/images/weddingTemplate.png', isCover: true }],
        previewUrl: '/checkout/invitation',
        templateId: 'template-02',
        isHotItem: true,
        categoryIds: cat2.data?.id ? [cat2.data.id] : [],
      });

      await this.create({
        product: 'Classic Monogram Digital Suite',
        description: 'Thiệp cưới kỹ thuật số chữ lồng quý tộc, tích hợp album ảnh cưới online và gửi lời chúc trực tiếp tới cô dâu chú rể.',
        tags: 'digital, online, luxury, monogram',
        price: 220000,
        images: [{ url: '/images/bestseller.png', isCover: true }],
        previewUrl: '/checkout/invitation',
        templateId: 'template-03',
        isHotItem: false,
        categoryIds: cat3.data?.id ? [cat3.data.id] : [],
      });

      this.logger.log('Digital invitation seed completed successfully.');
    } catch (error) {
      this.logger.warn(`Could not seed digital products: ${(error as Error).message}`);
    }
  }

  private async generateUniqueCode(name: string, excludeId?: string): Promise<string> {
    const baseSlug = slugify(name, { lower: true, strict: true, locale: 'vi' });
    let code = baseSlug || 'digital-product';
    let counter = 1;

    while (true) {
      const query = this.digitalProductRepository.createQueryBuilder('digital_product')
        .where('digital_product.productCode = :code', { code });

      if (excludeId) {
        query.andWhere('digital_product.id != :id', { id: excludeId });
      }

      const exists = await query.getOne();
      if (!exists) {
        return code;
      }
      code = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  async create(createProductDto: CreateDigitalProductDto) {
    const { categoryIds, categoryId, ...productData } = createProductDto;

    let productCode = productData.productCode;

    if (!productCode) {
      productCode = await this.generateUniqueCode(productData.product);
    } else {
      productCode = slugify(productCode, { lower: true, strict: true, locale: 'vi' });
      productCode = await this.generateUniqueCode(productCode);
    }

    productData.productCode = productCode;

    const product = this.digitalProductRepository.create(productData);

    const finalCategoryIds = categoryIds || (categoryId ? [categoryId] : []);

    if (finalCategoryIds.length > 0) {
      const foundCategories = await this.digitalCategoryService.findByIds(finalCategoryIds);
      if (foundCategories.length !== finalCategoryIds.length) {
        throw new BadRequestException('Digital category not found');
      }
      product.categories = foundCategories;
    }

    await this.digitalProductRepository.save(product);
    return { statusCode: HttpStatus.CREATED, message: "Digital product created successfully", data: product };
  }

  async findAll(pageOptionsDto: PageOptionsDto) {
    const { page = 0, size = 10, search, categoryId } = pageOptionsDto;
    const queryBuilder = this.digitalProductRepository.createQueryBuilder('digital_product');

    queryBuilder.leftJoinAndSelect('digital_product.categories', 'category')
      .leftJoinAndSelect('digital_product.template', 'template');

    if (search) {
      queryBuilder.where(
        '(digital_product.product ILIKE :search or digital_product.productCode ILIKE :search or digital_product.description ILIKE :search or digital_product.tags ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (categoryId) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryId);
      if (isUuid) {
        queryBuilder.andWhere('category.id = :categoryId', { categoryId });
      } else {
        queryBuilder.andWhere('(category.categoryCode = :categoryId OR category.category ILIKE :categoryId)', { categoryId });
      }
    }

    const paginatedResult = await paginate(queryBuilder, page, size);
    return paginatedResult;
  }

  async findBestSeller() {
    const hotItems = await this.digitalProductRepository.find({
      where: { isHotItem: true },
      take: 4,
      relations: { categories: true },
    });
    return {
      data: hotItems,
    };
  }

  async findOne(id: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const query = this.digitalProductRepository.createQueryBuilder('digital_product')
      .leftJoinAndSelect('digital_product.categories', 'category')
      .leftJoinAndSelect('digital_product.template', 'template');

    if (isUuid) {
      query.where('digital_product.id = :id', { id });
    } else {
      query.where('digital_product.productCode = :id', { id });
    }

    const product = await query.getOne();
    if (!product) {
      throw new NotFoundException("Digital product not found");
    }
    return product;
  }

  async update(id: string, updateProductDto: UpdateDigitalProductDto) {
    const existingProduct = await this.digitalProductRepository.findOne({
      where: { id },
      relations: { categories: true }
    });
    if (!existingProduct) {
      throw new NotFoundException("Digital product not found");
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
        const foundCategories = await this.digitalCategoryService.findByIds(finalCategoryIds);
        if (foundCategories.length !== finalCategoryIds.length) {
          throw new BadRequestException('Digital category not found');
        }
        existingProduct.categories = foundCategories;
      }
    }

    await this.digitalProductRepository.save(existingProduct);
    return { statusCode: HttpStatus.OK, message: "Digital product updated successfully", data: existingProduct };
  }

  async remove(id: string) {
    const existingProduct = await this.digitalProductRepository.findOne({ where: { id } });
    if (!existingProduct) {
      throw new NotFoundException("Digital product not found");
    }
    await this.digitalProductRepository.remove(existingProduct);
    return { statusCode: HttpStatus.OK, message: "Digital product deleted successfully" };
  }
}
