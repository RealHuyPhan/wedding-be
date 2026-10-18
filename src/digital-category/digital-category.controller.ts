import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { DigitalCategoryService } from './digital-category.service';
import { CreateDigitalCategoryDto } from './dto/create-digital-category.dto';
import { UpdateDigitalCategoryDto } from './dto/update-digital-category.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Digital Categories')
@Controller('digital-category')
export class DigitalCategoryController {
  constructor(private readonly digitalCategoryService: DigitalCategoryService) { }

  @ApiOperation({ summary: '[Admin] Create digital category', description: 'Create a new digital category (Admin only)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() createCategoryDto: CreateDigitalCategoryDto) {
    return this.digitalCategoryService.create(createCategoryDto);
  }

  @ApiOperation({ summary: 'Get digital categories list', description: 'Supports pagination and search (Public)' })
  @Get()
  findAll(@Query() pageOptionsDto: PageOptionsDto) {
    return this.digitalCategoryService.findAll(pageOptionsDto);
  }

  @ApiOperation({ summary: 'Get digital category details', description: 'View digital category details by ID (Public)' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.digitalCategoryService.findOne(id);
  }

  @ApiOperation({ summary: '[Admin] Update digital category', description: 'Edit digital category information (Admin only)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCategoryDto: UpdateDigitalCategoryDto) {
    return this.digitalCategoryService.update(id, updateCategoryDto);
  }

  @ApiOperation({ summary: '[Admin] Delete digital category', description: 'Delete digital category by ID (Admin only)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.digitalCategoryService.remove(id);
  }
}
