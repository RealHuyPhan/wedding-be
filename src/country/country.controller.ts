import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CountryService } from './country.service';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Country Config')
@Controller('country')
export class CountryController {
  constructor(private readonly countryService: CountryService) {}

  @ApiOperation({ summary: '[Admin] Add supported country', description: 'Add a new country to the supported shipping list (Admin only)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() createCountryDto: CreateCountryDto) {
    return this.countryService.create(createCountryDto);
  }

  @ApiOperation({ summary: 'Get all supported countries', description: 'Get the list of all countries supported for shipping' })
  @Get()
  findAll() {
    return this.countryService.findAll();
  }

  @ApiOperation({ summary: 'Get country details', description: 'Get details of a specific country by ID' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.countryService.findOne(id);
  }

  @ApiOperation({ summary: '[Admin] Update country', description: 'Update country information (Admin only)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCountryDto: UpdateCountryDto) {
    return this.countryService.update(id, updateCountryDto);
  }

  @ApiOperation({ summary: '[Admin] Delete country', description: 'Remove a country from supported shipping list (Admin only)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.countryService.remove(id);
  }
}
