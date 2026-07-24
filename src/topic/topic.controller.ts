import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { TopicService } from './topic.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { PageOptionsDto } from 'src/common/dto/page-options.dto';

@ApiTags('Topics')
@Controller('topic')
export class TopicController {
  constructor(private readonly topicService: TopicService) { }

  @ApiOperation({ summary: '[Admin] create topic', description: 'Create a new topic (Admin only)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() createTopicDto: CreateTopicDto) {
    return this.topicService.create(createTopicDto);
  }

  @ApiOperation({ summary: 'Get topics list', description: 'Supports pagination and search (Public)' })
  @Get()
  findAll(@Query() pageOptionsDto: PageOptionsDto) {
    return this.topicService.findAll(pageOptionsDto);
  }

  @ApiOperation({ summary: 'Get topic details', description: 'View topic details by ID (Public)' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.topicService.findOne(id);
  }

  @ApiOperation({ summary: '[Admin] update topic', description: 'Edit topic information (Admin only)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTopicDto: UpdateTopicDto) {
    return this.topicService.update(id, updateTopicDto);
  }

  @ApiOperation({ summary: '[Admin] delete topic', description: 'Delete topic by ID (Admin only)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.topicService.remove(id);
  }
}
