import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsString } from "class-validator";
import { EmailTemplateCode } from "../entities/email-template.entity";

export class CreateEmailTemplateDto {
    @ApiProperty()
    @IsEnum(EmailTemplateCode)
    code: EmailTemplateCode;

    @ApiProperty()
    @IsString()
    name: string

    @ApiProperty()
    @IsString()
    subject: string

    @ApiProperty()
    @IsString()
    contentHtml: string
}
