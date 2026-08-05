import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { EmailTemplate } from './entities/email-template.entity';
import { Repository } from 'typeorm';

@Injectable()
export class EmailTemplateService {
  constructor(
    @InjectRepository(EmailTemplate)
    private readonly emailTemplateRepository: Repository<EmailTemplate>,
  ) { }

  async createEmailTemplate(createEmailTemplateDto: CreateEmailTemplateDto) {
    // 1. Kiểm tra xem template với mã code này đã tồn tại chưa
    const existingTemplate = await this.emailTemplateRepository.findOne({
      where: { code: createEmailTemplateDto.code },
    });

    if (existingTemplate) {
      throw new BadRequestException(`Email with code ${createEmailTemplateDto.code} already exists!`);
    }

    // 2. Tạo đối tượng template mới từ DTO
    const newTemplate = this.emailTemplateRepository.create(createEmailTemplateDto);

    // 3. Lưu vào database
    return await this.emailTemplateRepository.save(newTemplate);
  }

  async findByCode(code: string) {
    return await this.emailTemplateRepository.findOne({
      where: { code },
    });
  }

  async findAll() {
    return await this.emailTemplateRepository.find();
  }

  async findOne(id: string) {
    const template = await this.emailTemplateRepository.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException(`Email template with ID ${id} not found`);
    }
    return template;
  }

  async update(id: string, updateEmailTemplateDto: UpdateEmailTemplateDto) {
    const template = await this.findOne(id);
    const updatedTemplate = Object.assign(template, updateEmailTemplateDto);
    return await this.emailTemplateRepository.save(updatedTemplate);
  }

  async remove(id: string) {
    const template = await this.findOne(id);
    return await this.emailTemplateRepository.remove(template);
  }
}
