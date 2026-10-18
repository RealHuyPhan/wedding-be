import { PartialType } from '@nestjs/swagger';
import { CreatePaidInvitationDto } from './create-paid-invitation.dto';

export class UpdatePaidInvitationDto extends PartialType(CreatePaidInvitationDto) {}
