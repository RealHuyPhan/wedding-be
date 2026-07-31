import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateWeddingInvitationDto {
    @IsOptional()
    @IsString()
    brideName?: string;

    @IsOptional()
    @IsString()
    groomName?: string;

    @IsOptional()
    @IsString()
    dayOfWeek?: string;

    @IsOptional()
    @IsString()
    eventDate?: string;

    @IsOptional()
    @IsString()
    eventMonth?: string;

    @IsOptional()
    @IsString()
    eventYear?: string;

    @IsOptional()
    @IsString()
    eventTime?: string;

    @IsOptional()
    @IsString()
    location?: string;
}
