import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateWeddingInvitationDto } from './dto/create-wedding-invitation.dto';
import { UpdateWeddingInvitationDto } from './dto/update-wedding-invitation.dto';
import { WeddingInvitation } from './entities/wedding-invitation.entity';

@Injectable()
export class WeddingInvitationService {
    constructor(
        @InjectRepository(WeddingInvitation)
        private readonly weddingInvitationRepository: Repository<WeddingInvitation>,
    ) {}

    async create(userId: string, createDto: CreateWeddingInvitationDto): Promise<WeddingInvitation> {
        const invitation = this.weddingInvitationRepository.create({
            ...createDto,
            user: { id: userId },
        });
        return await this.weddingInvitationRepository.save(invitation);
    }

    async findAll(userId: string): Promise<WeddingInvitation[]> {
        return await this.weddingInvitationRepository.find({
            where: { user: { id: userId } },
            order: { createdAt: 'DESC' },
        });
    }

    async findOne(id: string, userId: string): Promise<WeddingInvitation> {
        const invitation = await this.weddingInvitationRepository.findOne({
            where: { id, user: { id: userId } },
        });
        if (!invitation) {
            throw new NotFoundException(`Wedding invitation with ID ${id} not found`);
        }
        return invitation;
    }

    async update(id: string, userId: string, updateDto: UpdateWeddingInvitationDto): Promise<WeddingInvitation> {
        const invitation = await this.findOne(id, userId);
        Object.assign(invitation, updateDto);
        return await this.weddingInvitationRepository.save(invitation);
    }

    async updateByAdmin(id: string, updateDto: UpdateWeddingInvitationDto): Promise<WeddingInvitation> {
        const invitation = await this.weddingInvitationRepository.findOne({ where: { id } });
        if (!invitation) {
            throw new NotFoundException(`Wedding invitation with ID ${id} not found`);
        }
        Object.assign(invitation, updateDto);
        return await this.weddingInvitationRepository.save(invitation);
    }

    async remove(id: string, userId: string): Promise<void> {
        const invitation = await this.findOne(id, userId);
        await this.weddingInvitationRepository.remove(invitation);
    }
}
