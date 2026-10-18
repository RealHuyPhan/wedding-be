import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Res,
} from '@nestjs/common';
import { PaidInvitationService } from './paid-invitation.service';
import { CreatePaidInvitationDto } from './dto/create-paid-invitation.dto';
import { UpdatePaidInvitationDto } from './dto/update-paid-invitation.dto';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import type { Response } from 'express';

@Controller('paid-invitation')
export class PaidInvitationController {
  constructor(private readonly paidInvitationService: PaidInvitationService) {}

  @Post()
  create(@Body() dto: CreatePaidInvitationDto) {
    return this.paidInvitationService.create(dto);
  }

  @Get()
  findAll(@Query() pageOptionsDto: PageOptionsDto) {
    return this.paidInvitationService.findAll(pageOptionsDto);
  }

  /**
   * Public endpoint: Render full HTML invitation page for guests
   * GET /api/paid-invitation/view/:code
   */
  @Get('view/:code')
  async viewInvitation(@Param('code') code: string, @Res() res: Response) {
    const result = await this.paidInvitationService.renderInvitation(code);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(result.html);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.paidInvitationService.findOne(id);
  }

  /**
   * Extend invitation by +30 days
   * PATCH /api/paid-invitation/:id/extend
   */
  @Patch(':id/extend')
  extend(@Param('id') id: string) {
    return this.paidInvitationService.extend(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePaidInvitationDto) {
    return this.paidInvitationService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.paidInvitationService.remove(id);
  }
}
