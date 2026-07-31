import { PartialType } from '@nestjs/mapped-types';
import { CreateWeddingInvitationDto } from './create-wedding-invitation.dto';

export class UpdateWeddingInvitationDto extends PartialType(CreateWeddingInvitationDto) {}
