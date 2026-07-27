import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Blog } from './entities/blog.entity';
import { Repository, In } from 'typeorm';
import { Topic } from 'src/topic/entities/topic.entity';
import { generateUniqueSlug } from 'src/common/utils/slug.util';
import { PageOptionsDto } from 'src/common/dto/page-options.dto';
import { paginate } from 'src/common/utils/pagination.util';

@Injectable()
export class BlogService {
  constructor(
    @InjectRepository(Blog)
    private readonly blogRepository: Repository<Blog>,
    @InjectRepository(Topic)
    private readonly topicRepository: Repository<Topic>,
  ) { }

  async create(createBlogDto: CreateBlogDto) {
    let slug = createBlogDto.slug;
    if (!slug) {
      slug = await generateUniqueSlug(this.blogRepository, createBlogDto.title, 'slug', undefined, 'blog');
    } else {
      slug = await generateUniqueSlug(this.blogRepository, slug, 'slug', undefined, 'blog');
    }

    const blog = this.blogRepository.create({
      title: createBlogDto.title,
      description: createBlogDto.description,
      contentHtml: createBlogDto.contentHtml,
      thumbnail: createBlogDto.thumbnail,
      slug,
    });

    // Gắn topics nếu có topicIds
    if (createBlogDto.topicIds && createBlogDto.topicIds.length > 0) {
      blog.topics = await this.topicRepository.find({
        where: { id: In(createBlogDto.topicIds) },
      });
    }

    await this.blogRepository.save(blog);
    return { statusCode: HttpStatus.CREATED, message: "Blog created successfully" };
  }

  async findAll(pageOptionsDto: PageOptionsDto) {
    const { page = 0, size = 10, search, topicId } = pageOptionsDto;
    const queryBuilder = this.blogRepository.createQueryBuilder('blog')
      .leftJoinAndSelect('blog.topics', 'topic');

    if (search) {
      queryBuilder.andWhere(
        '(blog.title ILIKE :search OR blog.slug ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (topicId) {
      queryBuilder.innerJoin('blog.topics', 'filterTopic', 'filterTopic.id = :topicId', { topicId });
    }
    // Sắp xếp bài viết mới nhất lên trước
    queryBuilder.orderBy('blog.createdAt', 'DESC');

    const paginatedResult = await paginate(queryBuilder, page, size);
    return paginatedResult;
  }

  async findOne(id: string) {
    const blog = await this.blogRepository.findOne({
      where: { id },
      relations: { topics: true },
    });
    if (!blog) {
      throw new NotFoundException("Blog not found");
    }
    return blog;
  }

  async update(id: string, updateBlogDto: UpdateBlogDto) {
    const existingBlog = await this.blogRepository.findOne({
      where: { id },
      relations: { topics: true },
    });
    if (!existingBlog) {
      throw new NotFoundException("Blog not found");
    }
    if (updateBlogDto.slug) {
      updateBlogDto.slug = await generateUniqueSlug(this.blogRepository, updateBlogDto.slug, 'slug', id, 'blog');
    } else if (updateBlogDto.title && updateBlogDto.title !== existingBlog.title) {
      updateBlogDto.slug = await generateUniqueSlug(this.blogRepository, updateBlogDto.title, 'slug', id, 'blog');
    }

    // Cập nhật topics nếu có topicIds
    if (updateBlogDto.topicIds !== undefined) {
      if (updateBlogDto.topicIds.length > 0) {
        existingBlog.topics = await this.topicRepository.find({
          where: { id: In(updateBlogDto.topicIds) },
        });
      } else {
        existingBlog.topics = [];
      }
    }

    // Cập nhật các trường khác (trừ topicIds vì nó không phải column)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { topicIds, ...restDto } = updateBlogDto;
    Object.assign(existingBlog, restDto);

    await this.blogRepository.save(existingBlog);
    return { statusCode: HttpStatus.OK, message: "Blog updated successfully" };
  }

  async remove(id: string) {
    const existingBlog = await this.blogRepository.findOne({ where: { id } });
    if (!existingBlog) {
      throw new NotFoundException("Blog not found");
    }
    await this.blogRepository.remove(existingBlog);
    return { statusCode: HttpStatus.OK, message: "Blog deleted successfully" };
  }
}
