import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WeddingInvitationService } from './wedding-invitation.service';
import { WeddingInvitationController } from './wedding-invitation.controller';
import { WeddingInvitation } from './entities/wedding-invitation.entity';

@Module({
    imports: [TypeOrmModule.forFeature([WeddingInvitation])],
    controllers: [WeddingInvitationController],
    providers: [WeddingInvitationService],
    exports: [WeddingInvitationService],
})
export class WeddingInvitationModule {}
