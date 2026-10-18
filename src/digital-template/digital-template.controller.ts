import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  Patch,
  UseGuards,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DigitalTemplateService } from './digital-template.service';
import { CreateDigitalTemplateDto } from './dto/create-digital-template.dto';
import { UpdateDigitalTemplateDto } from './dto/update-digital-template.dto';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

@ApiTags('Digital Templates')
@Controller('digital-template')
export class DigitalTemplateController {
  constructor(private readonly digitalTemplateService: DigitalTemplateService) {}

  @ApiOperation({ summary: '[Admin] Create digital invitation template' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() dto: CreateDigitalTemplateDto) {
    return this.digitalTemplateService.create(dto);
  }

  @ApiOperation({ summary: 'Get digital templates list' })
  @Get()
  findAll(@Query() pageOptionsDto: PageOptionsDto) {
    return this.digitalTemplateService.findAll(pageOptionsDto);
  }

  @ApiOperation({ summary: 'Preview template with sample couple data (Render HTML)' })
  @Get('preview/:id')
  async previewTemplate(@Param('id') id: string, @Res() res: Response) {
    const sampleContext = {
      groomName: 'Phan Sỹ Huy',
      brideName: 'Vương Khánh Linh',
      dayOfWeek: 'Chủ Nhật',
      eventDate: '28',
      eventMonth: '12',
      eventYear: '2026',
      eventTime: '18:00',
      location: 'The Grand Ballroom, 789 Đại Lộ Hoàng Gia, Hà Nội',
      musicUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=romantic-wedding-piano-113009.mp3',
    };

    const html = await this.digitalTemplateService.renderHtml(id, sampleContext);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  }

  @ApiOperation({ summary: 'Get digital template detail by ID or Slug' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.digitalTemplateService.findOne(id);
  }

  @ApiOperation({ summary: '[Admin] Update digital template' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDigitalTemplateDto) {
    return this.digitalTemplateService.update(id, dto);
  }

  @ApiOperation({ summary: '[Admin] Delete digital template' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.digitalTemplateService.remove(id);
  }
}
