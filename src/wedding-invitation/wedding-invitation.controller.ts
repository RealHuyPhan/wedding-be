import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WeddingInvitationService } from './wedding-invitation.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateWeddingInvitationDto } from './dto/create-wedding-invitation.dto';
import { UpdateWeddingInvitationDto } from './dto/update-wedding-invitation.dto';

interface RequestWithUser {
    user: { id: string };
}

@ApiTags('Wedding Invitations')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('wedding-invitation')
export class WeddingInvitationController {
    constructor(private readonly weddingInvitationService: WeddingInvitationService) { }

    @ApiOperation({ summary: 'Create wedding invitation', description: 'Create a new wedding invitation for the logged-in user' })
    @Post()
    create(@Request() req: RequestWithUser, @Body() createDto: CreateWeddingInvitationDto) {
        return this.weddingInvitationService.create(req.user.id, createDto);
    }

    @ApiOperation({ summary: 'Get all wedding invitations', description: 'Get all wedding invitations of the logged-in user' })
    @Get()
    findAll(@Request() req: RequestWithUser) {
        return this.weddingInvitationService.findAll(req.user.id);
    }

    @ApiOperation({ summary: 'Get wedding invitation details', description: 'Get details of a specific wedding invitation' })
    @Get(':id')
    findOne(@Request() req: RequestWithUser, @Param('id') id: string) {
        return this.weddingInvitationService.findOne(id, req.user.id);
    }

    @ApiOperation({ summary: 'Update wedding invitation', description: 'Update details of a specific wedding invitation' })
    @Patch(':id')
    update(@Request() req: RequestWithUser, @Param('id') id: string, @Body() updateDto: UpdateWeddingInvitationDto) {
        return this.weddingInvitationService.update(id, req.user.id, updateDto);
    }

    @ApiOperation({ summary: '[Admin] Update wedding invitation', description: 'Admin can update any wedding invitation' })
    @UseGuards(RolesGuard)
    @Roles('admin')
    @Patch('admin/:id')
    updateByAdmin(@Param('id') id: string, @Body() updateDto: UpdateWeddingInvitationDto) {
        return this.weddingInvitationService.updateByAdmin(id, updateDto);
    }

    @ApiOperation({ summary: 'Delete wedding invitation', description: 'Permanently delete a wedding invitation' })
    @Delete(':id')
    remove(@Request() req: RequestWithUser, @Param('id') id: string) {
        return this.weddingInvitationService.remove(id, req.user.id);
    }
}
