import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { PaidDigitalInvitation } from './entities/paid-digital-invitation.entity';
import { PaidInvitationService } from './paid-invitation.service';
import { PaidInvitationController } from './paid-invitation.controller';
import { DigitalTemplateModule } from '../digital-template/digital-template.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaidDigitalInvitation]),
    ScheduleModule.forRoot(),
    DigitalTemplateModule,
  ],
  controllers: [PaidInvitationController],
  providers: [PaidInvitationService],
  exports: [PaidInvitationService],
})
export class PaidInvitationModule {}
