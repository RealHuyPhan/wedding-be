import {
  Injectable,
  NotFoundException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PaidDigitalInvitation,
  InvitationStatus,
} from './entities/paid-digital-invitation.entity';
import { CreatePaidInvitationDto } from './dto/create-paid-invitation.dto';
import { UpdatePaidInvitationDto } from './dto/update-paid-invitation.dto';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { paginate } from '../common/utils/pagination.util';
import { DigitalTemplateService } from '../digital-template/digital-template.service';
import slugify from 'slugify';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as Handlebars from 'handlebars';

@Injectable()
export class PaidInvitationService {
  private readonly logger = new Logger(PaidInvitationService.name);

  constructor(
    @InjectRepository(PaidDigitalInvitation)
    private readonly repo: Repository<PaidDigitalInvitation>,
    private readonly digitalTemplateService: DigitalTemplateService,
  ) {}

  /**
   * Generate a unique, SEO-friendly invite code from couple names
   */
  private async generateInviteCode(
    groomName: string,
    brideName: string,
  ): Promise<string> {
    const baseSlug = slugify(`${groomName}-va-${brideName}`, {
      lower: true,
      strict: true,
      locale: 'vi',
    });
    let code = baseSlug || 'invite';
    let counter = 1;

    while (true) {
      const exists = await this.repo.findOne({
        where: { inviteCode: code },
      });
      if (!exists) return code;
      code = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  /**
   * Create a new paid invitation (activated immediately, expires in 30 days)
   */
  async create(dto: CreatePaidInvitationDto) {
    const inviteCode =
      dto.inviteCode ||
      (await this.generateInviteCode(
        dto.coupleData.groomName,
        dto.coupleData.brideName,
      ));

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days

    const invitation = this.repo.create({
      inviteCode,
      userId: dto.userId || undefined,
      digitalProductId: dto.digitalProductId || undefined,
      templateId: dto.templateId || undefined,
      coupleData: dto.coupleData,
      status: InvitationStatus.ACTIVE,
      expiresAt,
    } as Partial<PaidDigitalInvitation>);

    await this.repo.save(invitation);

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Paid invitation created successfully',
      data: invitation,
    };
  }

  /**
   * Get all paid invitations with pagination + search
   */
  async findAll(pageOptionsDto: PageOptionsDto) {
    const { page = 0, size = 10, search } = pageOptionsDto;
    const queryBuilder = this.repo.createQueryBuilder('invitation');

    queryBuilder
      .leftJoinAndSelect('invitation.user', 'user')
      .leftJoinAndSelect('invitation.digitalProduct', 'digitalProduct')
      .leftJoinAndSelect('invitation.template', 'template');

    if (search) {
      queryBuilder.where(
        `(invitation.inviteCode ILIKE :search 
          OR invitation.coupleData->>'groomName' ILIKE :search 
          OR invitation.coupleData->>'brideName' ILIKE :search
          OR user.email ILIKE :search
          OR user.name ILIKE :search)`,
        { search: `%${search}%` },
      );
    }

    queryBuilder.orderBy('invitation.createdAt', 'DESC');

    return await paginate(queryBuilder, page, size);
  }

  /**
   * Find invitation by ID or invite code
   */
  async findOne(idOrCode: string) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        idOrCode,
      );

    const queryBuilder = this.repo.createQueryBuilder('invitation');
    queryBuilder
      .leftJoinAndSelect('invitation.user', 'user')
      .leftJoinAndSelect('invitation.digitalProduct', 'digitalProduct')
      .leftJoinAndSelect('invitation.template', 'template');

    if (isUuid) {
      queryBuilder.where('invitation.id = :id', { id: idOrCode });
    } else {
      queryBuilder.where('invitation.inviteCode = :code', {
        code: idOrCode,
      });
    }

    const invitation = await queryBuilder.getOne();
    if (!invitation) {
      throw new NotFoundException('Paid invitation not found');
    }
    return invitation;
  }

  /**
   * Render full HTML for a paid invitation (public view)
   */
  async renderInvitation(inviteCode: string): Promise<{
    html: string;
    invitation: PaidDigitalInvitation;
    isExpired: boolean;
  }> {
    const invitation = await this.findOne(inviteCode);
    const isExpired =
      invitation.status === InvitationStatus.EXPIRED ||
      new Date() > new Date(invitation.expiresAt);

    if (isExpired) {
      return {
        html: this.renderExpiredPage(invitation),
        invitation,
        isExpired: true,
      };
    }

    // Increment view count (fire-and-forget)
    this.repo.increment({ id: invitation.id }, 'viewsCount', 1);

    // If the invitation has a linked template, compile it with couple data
    if (invitation.template) {
      const context = {
        ...invitation.coupleData,
        inviteCode: invitation.inviteCode,
      };

      const compiledBody = Handlebars.compile(
        invitation.template.htmlContent || '',
      )(context);
      const compiledJs = Handlebars.compile(
        invitation.template.jsContent || '',
      )(context);

      const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${context.groomName || 'Chú rể'} & ${context.brideName || 'Cô dâu'} - Thiệp Cưới Online</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap" rel="stylesheet">
  <style>
    ${invitation.template.cssContent || ''}
  </style>
</head>
<body>
  ${compiledBody}
  <script>
    ${compiledJs}
  </script>
</body>
</html>`;

      return { html, invitation, isExpired: false };
    }

    // Fallback: no template linked
    return {
      html: `<html><body><h1>Template not configured</h1><p>Contact admin to assign a template.</p></body></html>`,
      invitation,
      isExpired: false,
    };
  }

  /**
   * Render a graceful expired page
   */
  private renderExpiredPage(invitation: PaidDigitalInvitation): string {
    const { groomName, brideName } = invitation.coupleData || {};
    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thiệp Cưới - Đã Hết Hạn</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Playfair Display', Georgia, serif;
      background: linear-gradient(135deg, #FDF9F6 0%, #F8F0E8 100%);
      color: #2a241c;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    .expired-card {
      max-width: 480px;
      width: 100%;
      background: #FFFFFF;
      border: 1px solid #EADDCF;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(87, 0, 19, 0.08);
      padding: 48px 32px;
      text-align: center;
    }
    .expired-icon { font-size: 48px; margin-bottom: 20px; }
    .expired-title { font-size: 22px; color: #570013; margin-bottom: 12px; }
    .expired-couple { font-size: 26px; font-weight: 700; color: #2a241c; margin-bottom: 16px; }
    .expired-msg {
      font-size: 14px; color: #666; line-height: 1.7; font-style: italic;
      border-top: 1px solid #F0EBE1; padding-top: 20px; margin-top: 8px;
    }
    .watermark {
      display: block; font-size: 10px; color: #AAA;
      letter-spacing: 0.15em; text-transform: uppercase; margin-top: 24px;
    }
  </style>
</head>
<body>
  <div class="expired-card">
    <div class="expired-icon">💌</div>
    <h1 class="expired-title">Thiệp Cưới Online</h1>
    <p class="expired-couple">${groomName || ''} & ${brideName || ''}</p>
    <p class="expired-msg">
      Thiệp cưới online đã kết thúc thời hạn hiển thị 30 ngày.<br>
      Chúc hai bạn trăm năm hạnh phúc! 💕
    </p>
    <span class="watermark">Duyen Wedding Stationery • Digital Invitation</span>
  </div>
</body>
</html>`;
  }

  /**
   * Update a paid invitation
   */
  async update(id: string, dto: UpdatePaidInvitationDto) {
    const existing = await this.findOne(id);

    if (dto.coupleData) {
      existing.coupleData = { ...existing.coupleData, ...dto.coupleData };
    }
    if (dto.templateId !== undefined) existing.templateId = dto.templateId;
    if (dto.digitalProductId !== undefined)
      existing.digitalProductId = dto.digitalProductId;

    await this.repo.save(existing);
    return {
      statusCode: HttpStatus.OK,
      message: 'Paid invitation updated successfully',
      data: existing,
    };
  }

  /**
   * Extend invitation by 30 more days from now
   */
  async extend(id: string) {
    const invitation = await this.findOne(id);
    const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    invitation.expiresAt = newExpiry;
    invitation.status = InvitationStatus.ACTIVE;
    await this.repo.save(invitation);

    return {
      statusCode: HttpStatus.OK,
      message: 'Invitation extended by 30 days',
      data: invitation,
    };
  }

  /**
   * Delete a paid invitation permanently
   */
  async remove(id: string) {
    const existing = await this.findOne(id);
    await this.repo.remove(existing);
    return {
      statusCode: HttpStatus.OK,
      message: 'Paid invitation deleted permanently',
    };
  }

  /**
   * CRON: Run daily at 2:00 AM to clean up expired invitations
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupExpiredInvitations() {
    const now = new Date();
    this.logger.log(
      `Running 30-day cleanup for expired invitations at ${now.toISOString()}...`,
    );

    const result = await this.repo
      .createQueryBuilder()
      .delete()
      .from(PaidDigitalInvitation)
      .where('expiresAt < :now', { now })
      .execute();

    this.logger.log(
      `Cleaned up ${result.affected || 0} expired digital invitations.`,
    );
  }
}
