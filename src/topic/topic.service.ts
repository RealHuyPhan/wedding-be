import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Topic } from './entities/topic.entity';
import { Repository } from 'typeorm';
import { generateUniqueSlug } from 'src/common/utils/slug.util';
import { PageOptionsDto } from 'src/common/dto/page-options.dto';
import { paginate } from 'src/common/utils/pagination.util';

@Injectable()
export class TopicService {
  constructor(
    @InjectRepository(Topic)
    private readonly topicRepository: Repository<Topic>
  ) { }
  async create(createTopicDto: CreateTopicDto) {
    let topicCode = createTopicDto.topicCode;
    if (!topicCode) {
      topicCode = await generateUniqueSlug(this.topicRepository, createTopicDto.topic, 'topicCode', undefined, 'topic');
    } else {
      topicCode = await generateUniqueSlug(this.topicRepository, topicCode, 'topicCode', undefined, 'topic');
    }
    createTopicDto.topicCode = topicCode
    const topic = this.topicRepository.create(createTopicDto);
    await this.topicRepository.save(topic);
    return { statusCode: HttpStatus.CREATED, message: "Topic created successfully" };
  }

  async findAll(pageOptionsDto: PageOptionsDto) {
    const { page = 0, size = 10, search } = pageOptionsDto;
    const queryBuilder = this.topicRepository.createQueryBuilder('topic');

    if (search) {
      queryBuilder.where(
        '(topic.topic ILIKE :search OR topic.topicCode ILIKE :search OR topic.description ILIKE :search)',
        { search: `%${search}%` }
      )
    }
    const paginatedResult = await paginate(queryBuilder, page, size);
    return paginatedResult;
  }

  async findOne(id: string) {
    const topic = await this.topicRepository.findOne({ where: { id } });
    if (!topic) {
      throw new NotFoundException("Topic not found");
    }
    return topic;
  }

  async update(id: string, updateTopicDto: UpdateTopicDto) {
    const existingTopic = await this.topicRepository.findOne({ where: { id } });
    if (!existingTopic) {
      throw new NotFoundException("Topic not found");
    }
    if (updateTopicDto.topicCode) {
      updateTopicDto.topicCode = await generateUniqueSlug(this.topicRepository, updateTopicDto.topicCode, 'topicCode', id, 'topic');
    } else if (updateTopicDto.topic && updateTopicDto.topic !== existingTopic.topic) {
      updateTopicDto.topicCode = await generateUniqueSlug(this.topicRepository, updateTopicDto.topic, 'topicCode', id, 'topic');
    }

    Object.assign(existingTopic, updateTopicDto);
    await this.topicRepository.save(existingTopic);
    return { statusCode: HttpStatus.OK, message: "Topic updated successfully" };
  }

  async remove(id: string) {
    const existingTopic = await this.topicRepository.findOne({ where: { id } });
    if (!existingTopic) {
      throw new NotFoundException("Topic not found");
    }
    await this.topicRepository.remove(existingTopic);
    return { statusCode: HttpStatus.OK, message: "Topic deleted successfully" };
  }
}
