import { Module } from "@nestjs/common";
import { EmailService } from "./email.service";
import { EmailTemplateModule } from "../email-template/email-template.module";

@Module({
    imports: [EmailTemplateModule],
    providers: [EmailService],
    exports: [EmailService],
})

export class EmailModule { }