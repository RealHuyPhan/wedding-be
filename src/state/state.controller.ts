import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { StateService } from './state.service';
import { CreateStateDto } from './dto/create-state.dto';
import { UpdateStateDto } from './dto/update-state.dto';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('State Config')
@Controller('state')
export class StateController {
  constructor(private readonly stateService: StateService) {}

  @ApiOperation({ summary: '[Admin] Add supported state', description: 'Add a new state/province to the supported shipping list (Admin only)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() createStateDto: CreateStateDto) {
    return this.stateService.create(createStateDto);
  }

  @ApiOperation({ summary: 'Get all supported states', description: 'Get the list of states/provinces. Optionally filter by country code.' })
  @ApiQuery({ name: 'countryCode', required: false, description: 'Filter states by country code (e.g. US, CA)' })
  @Get()
  findAll(@Query('countryCode') countryCode?: string) {
    return this.stateService.findAll(countryCode);
  }

  @ApiOperation({ summary: 'Get state details', description: 'Get details of a specific state by ID' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.stateService.findOne(id);
  }

  @ApiOperation({ summary: '[Admin] Update state', description: 'Update state information (Admin only)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateStateDto: UpdateStateDto) {
    return this.stateService.update(id, updateStateDto);
  }

  @ApiOperation({ summary: '[Admin] Delete state', description: 'Remove a state from supported shipping list (Admin only)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.stateService.remove(id);
  }
}
