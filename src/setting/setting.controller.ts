import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { SettingService } from './setting.service';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Settings')
@Controller('settings')
export class SettingController {
  constructor(private readonly settingService: SettingService) {}

  @ApiOperation({ summary: 'Get all settings', description: 'Get all global settings (Admin only)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get()
  findAll() {
    return this.settingService.findAll();
  }

  @ApiOperation({ summary: 'Get a setting by key', description: 'Get the value of a specific setting by key' })
  @Get(':key')
  async findOne(@Param('key') key: string) {
    const value = await this.settingService.getValue(key);
    return { key, value };
  }

  @ApiOperation({ summary: '[Admin] Update setting', description: 'Update or create a setting (Admin only)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Put(':key')
  update(@Param('key') key: string, @Body() updateSettingDto: UpdateSettingDto) {
    return this.settingService.setValue(key, updateSettingDto.value);
  }
}
