import { Injectable, NotFoundException, HttpStatus, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DigitalTemplate } from './entities/digital-template.entity';
import { CreateDigitalTemplateDto } from './dto/create-digital-template.dto';
import { UpdateDigitalTemplateDto } from './dto/update-digital-template.dto';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { paginate } from '../common/utils/pagination.util';
import slugify from 'slugify';
import * as Handlebars from 'handlebars';

@Injectable()
export class DigitalTemplateService implements OnModuleInit {
  private readonly logger = new Logger(DigitalTemplateService.name);

  constructor(
    @InjectRepository(DigitalTemplate)
    private readonly digitalTemplateRepository: Repository<DigitalTemplate>,
  ) {}

  async onModuleInit() {
    await this.seedInitialTemplates();
  }

  private async generateUniqueSlug(name: string, excludeId?: string): Promise<string> {
    const baseSlug = slugify(name, { lower: true, strict: true, locale: 'vi' });
    let code = baseSlug || 'template';
    let counter = 1;

    while (true) {
      const query = this.digitalTemplateRepository.createQueryBuilder('t')
        .where('t.slug = :code', { code });

      if (excludeId) {
        query.andWhere('t.id != :id', { id: excludeId });
      }

      const exists = await query.getOne();
      if (!exists) {
        return code;
      }
      code = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  private async seedInitialTemplates() {
    try {
      const count = await this.digitalTemplateRepository.count();
      if (count > 0) return;

      this.logger.log('Seeding initial digital invitation template...');

      const defaultHtml = `
<div class="invitation-wrapper">
  <!-- Audio Controls -->
  <div class="audio-control" id="audioToggle">
    <span class="music-icon">🎵</span>
    <span class="music-label">Phát nhạc</span>
  </div>
  <audio id="weddingAudio" src="{{musicUrl}}" loop preload="auto"></audio>

  <!-- Envelope / Header Hero -->
  <div class="hero-section">
    <div class="monogram-badge">D & H</div>
    <span class="save-the-date">SAVE OUR DATE</span>
    <h1 class="couple-title">
      <span class="groom-name">{{groomName}}</span>
      <span class="ampersand">&amp;</span>
      <span class="bride-name">{{brideName}}</span>
    </h1>
    <div class="decorative-line"></div>
    <p class="tagline">Trân trọng kính mời quý khách đến chung vui cùng gia đình chúng tôi</p>
  </div>

  <!-- Countdown Section -->
  <div class="countdown-section">
    <h3 class="section-title">ĐẾM NGƯỢC NGÀY CHUNG ĐÔI</h3>
    <div class="timer-grid">
      <div class="timer-box"><span class="timer-num" id="days">00</span><span class="timer-unit">Ngày</span></div>
      <div class="timer-box"><span class="timer-num" id="hours">00</span><span class="timer-unit">Giờ</span></div>
      <div class="timer-box"><span class="timer-num" id="minutes">00</span><span class="timer-unit">Phút</span></div>
      <div class="timer-box"><span class="timer-num" id="seconds">00</span><span class="timer-unit">Giây</span></div>
    </div>
  </div>

  <!-- Event Details Card -->
  <div class="details-card">
    <h2 class="card-heading">THỜI GIAN &amp; ĐỊA ĐIỂM</h2>
    <div class="event-time">
      <p class="day-text">{{dayOfWeek}}</p>
      <p class="full-date">{{eventDate}} Tháng {{eventMonth}} Năm {{eventYear}}</p>
      <p class="clock-time">Vào lúc: <strong>{{eventTime}}</strong></p>
    </div>

    <div class="event-venue">
      <div class="venue-icon">📍</div>
      <h3 class="venue-name">TRUNG TÂM TIỆC CƯỚI</h3>
      <p class="venue-address">{{location}}</p>
    </div>

    <!-- RSVP Button -->
    <div class="rsvp-action">
      <a href="https://maps.google.com/?q={{location}}" target="_blank" class="btn-map">Xem bản đồ chỉ đường</a>
      <button class="btn-rsvp" onclick="alert('Cảm ơn bạn đã phản hồi! Lời chúc của bạn đã được ghi nhận.')">Xác nhận tham dự (RSVP)</button>
    </div>
  </div>

  <!-- Footer Wish -->
  <div class="footer-section">
    <p class="footer-quote">"Sự hiện diện của quý khách là niềm vinh hạnh lớn nhất cho gia đình chúng tôi!"</p>
    <span class="watermark">Duyen Wedding Stationery • Digital Invitation</span>
  </div>
</div>
`;

      const defaultCss = `
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
body {
  font-family: 'Playfair Display', Georgia, serif;
  background: #FCFAF8;
  color: #2a241c;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px 10px;
}
.invitation-wrapper {
  max-width: 520px;
  width: 100%;
  background: #FFFFFF;
  border: 1px solid #EADDCF;
  border-radius: 8px;
  box-shadow: 0 15px 40px rgba(87, 0, 19, 0.08);
  padding: 40px 24px;
  text-align: center;
  position: relative;
  overflow: hidden;
}
.audio-control {
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid #EADDCF;
  border-radius: 20px;
  padding: 6px 14px;
  font-size: 11px;
  font-weight: 600;
  color: #570013;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  z-index: 20;
  transition: all 0.3s;
}
.audio-control:hover {
  background: #570013;
  color: #FFFFFF;
}
.monogram-badge {
  display: inline-block;
  width: 54px;
  height: 54px;
  line-height: 52px;
  border: 1px solid #570013;
  border-radius: 50%;
  font-size: 16px;
  font-weight: bold;
  letter-spacing: 2px;
  color: #570013;
  margin-bottom: 16px;
}
.save-the-date {
  display: block;
  font-size: 11px;
  font-weight: bold;
  letter-spacing: 0.25em;
  color: #8C6D58;
  margin-bottom: 12px;
}
.couple-title {
  font-size: 32px;
  line-height: 1.3;
  color: #2a241c;
  margin-bottom: 16px;
}
.groom-name, .bride-name {
  display: block;
  font-weight: 700;
}
.ampersand {
  display: block;
  font-size: 24px;
  color: #570013;
  margin: 4px 0;
  font-style: italic;
}
.decorative-line {
  width: 80px;
  height: 2px;
  background: #570013;
  margin: 16px auto;
  opacity: 0.5;
}
.tagline {
  font-size: 13px;
  font-style: italic;
  color: #666;
  margin-bottom: 28px;
  line-height: 1.6;
}
.countdown-section {
  background: #FDF9F6;
  border: 1px solid #F0EBE1;
  border-radius: 6px;
  padding: 20px 12px;
  margin-bottom: 28px;
}
.section-title {
  font-size: 11px;
  font-weight: bold;
  letter-spacing: 0.2em;
  color: #570013;
  margin-bottom: 14px;
}
.timer-grid {
  display: flex;
  justify-content: center;
  gap: 12px;
}
.timer-box {
  background: #FFFFFF;
  border: 1px solid #EADDCF;
  border-radius: 4px;
  width: 65px;
  padding: 10px 4px;
}
.timer-num {
  display: block;
  font-size: 22px;
  font-weight: bold;
  color: #2a241c;
}
.timer-unit {
  font-size: 10px;
  color: #888;
  text-transform: uppercase;
}
.details-card {
  border-top: 1px dashed #EADDCF;
  padding-top: 24px;
  margin-bottom: 24px;
}
.card-heading {
  font-size: 13px;
  font-weight: bold;
  letter-spacing: 0.15em;
  color: #570013;
  margin-bottom: 16px;
}
.full-date {
  font-size: 18px;
  font-weight: bold;
  color: #2a241c;
  margin: 6px 0;
}
.clock-time {
  font-size: 14px;
  color: #555;
}
.event-venue {
  margin-top: 20px;
  padding: 16px;
  background: #FAF8F5;
  border-radius: 6px;
}
.venue-icon {
  font-size: 22px;
  margin-bottom: 4px;
}
.venue-name {
  font-size: 12px;
  font-weight: bold;
  letter-spacing: 0.15em;
  color: #2a241c;
}
.venue-address {
  font-size: 13px;
  color: #666;
  margin-top: 6px;
  line-height: 1.5;
}
.rsvp-action {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 24px;
}
.btn-map, .btn-rsvp {
  display: block;
  width: 100%;
  padding: 12px 16px;
  font-size: 12px;
  font-weight: bold;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  border-radius: 4px;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.3s;
}
.btn-map {
  background: #FFFFFF;
  border: 1px solid #570013;
  color: #570013;
}
.btn-map:hover {
  background: #F8F3EF;
}
.btn-rsvp {
  background: #570013;
  border: 1px solid #570013;
  color: #FFFFFF;
}
.btn-rsvp:hover {
  background: #3B000D;
}
.footer-section {
  border-top: 1px solid #F0EBE1;
  padding-top: 20px;
}
.footer-quote {
  font-size: 12px;
  font-style: italic;
  color: #777;
  line-height: 1.6;
}
.watermark {
  display: block;
  font-size: 9px;
  color: #AAA;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  margin-top: 14px;
}
`;

      const defaultJs = `
// Audio toggle control
const audio = document.getElementById('weddingAudio');
const audioToggle = document.getElementById('audioToggle');
let isPlaying = false;

if (audioToggle && audio) {
  audioToggle.addEventListener('click', function() {
    if (isPlaying) {
      audio.pause();
      audioToggle.querySelector('.music-label').textContent = 'Phát nhạc';
      isPlaying = false;
    } else {
      audio.play().then(() => {
        audioToggle.querySelector('.music-label').textContent = 'Tạm dừng';
        isPlaying = true;
      }).catch(err => {
        console.log('Audio autoplay prevented:', err);
      });
    }
  });

  // Enable audio on first user touch anywhere
  document.body.addEventListener('click', function initAudio() {
    if (!isPlaying && audio.src) {
      audio.play().then(() => {
        audioToggle.querySelector('.music-label').textContent = 'Tạm dừng';
        isPlaying = true;
      }).catch(() => {});
    }
    document.body.removeEventListener('click', initAudio);
  }, { once: true });
}

// Countdown timer logic
function startCountdown() {
  const year = parseInt("{{eventYear}}") || 2026;
  const month = parseInt("{{eventMonth}}") || 12;
  const day = parseInt("{{eventDate}}") || 25;
  const targetDate = new Date(year, month - 1, day, 18, 0, 0).getTime();

  function update() {
    const now = new Date().getTime();
    const diff = targetDate - now;

    if (diff <= 0) {
      document.getElementById('days').textContent = '00';
      document.getElementById('hours').textContent = '00';
      document.getElementById('minutes').textContent = '00';
      document.getElementById('seconds').textContent = '00';
      return;
    }

    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);

    document.getElementById('days').textContent = d < 10 ? '0' + d : d;
    document.getElementById('hours').textContent = h < 10 ? '0' + h : h;
    document.getElementById('minutes').textContent = m < 10 ? '0' + m : m;
    document.getElementById('seconds').textContent = s < 10 ? '0' + s : s;
  }

  update();
  setInterval(update, 1000);
}

startCountdown();
`;

      await this.digitalTemplateRepository.save({
        name: 'The Celestial Romantic Suite',
        slug: 'the-celestial-romantic-suite',
        description: 'Mẫu thiệp cưới điện tử cao cấp với hiệu ứng đếm ngược ngày chung đôi, phát nhạc piano lãng mạn và bản đồ chỉ đường.',
        thumbnail: '/images/hero.png',
        htmlContent: defaultHtml.trim(),
        cssContent: defaultCss.trim(),
        jsContent: defaultJs.trim(),
        defaultMusicUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=romantic-wedding-piano-113009.mp3',
        isActive: true,
      });

      this.logger.log('Digital invitation template seeded successfully.');
    } catch (error) {
      this.logger.warn(`Could not seed digital template: ${(error as Error).message}`);
    }
  }

  async create(dto: CreateDigitalTemplateDto) {
    let slug = dto.slug;
    if (!slug) {
      slug = await this.generateUniqueSlug(dto.name);
    } else {
      slug = await this.generateUniqueSlug(slug);
    }

    dto.slug = slug;
    const template = this.digitalTemplateRepository.create(dto);
    await this.digitalTemplateRepository.save(template);
    return { statusCode: HttpStatus.CREATED, message: 'Digital template created successfully', data: template };
  }

  async findAll(pageOptionsDto: PageOptionsDto) {
    const { page = 0, size = 10, search } = pageOptionsDto;
    const queryBuilder = this.digitalTemplateRepository.createQueryBuilder('template');

    if (search) {
      queryBuilder.where(
        '(template.name ILIKE :search or template.slug ILIKE :search or template.description ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    return await paginate(queryBuilder, page, size);
  }

  async findOne(id: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const where = isUuid ? { id } : { slug: id };
    const template = await this.digitalTemplateRepository.findOne({ where });

    if (!template) {
      throw new NotFoundException('Digital template not found');
    }
    return template;
  }

  async update(id: string, dto: UpdateDigitalTemplateDto) {
    const existing = await this.findOne(id);

    if (dto.slug && dto.slug !== existing.slug) {
      dto.slug = await this.generateUniqueSlug(dto.slug, existing.id);
    } else if (dto.name && dto.name !== existing.name && !dto.slug) {
      dto.slug = await this.generateUniqueSlug(dto.name, existing.id);
    }

    Object.assign(existing, dto);
    await this.digitalTemplateRepository.save(existing);
    return { statusCode: HttpStatus.OK, message: 'Digital template updated successfully', data: existing };
  }

  async remove(id: string) {
    const existing = await this.findOne(id);
    await this.digitalTemplateRepository.remove(existing);
    return { statusCode: HttpStatus.OK, message: 'Digital template deleted successfully' };
  }

  /**
   * Compiles HTML template with context using Handlebars engine
   */
  async renderHtml(templateIdOrSlug: string, context: Record<string, unknown>): Promise<string> {
    const template = await this.findOne(templateIdOrSlug);

    const compiledBody = Handlebars.compile(template.htmlContent || '')(context);
    const compiledJs = Handlebars.compile(template.jsContent || '')(context);
    const groom = (typeof context.groomName === 'string' && context.groomName) || 'Chú rể';
    const bride = (typeof context.brideName === 'string' && context.brideName) || 'Cô dâu';

    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${groom} & ${bride} - Thiệp Cưới Online</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap" rel="stylesheet">
  <style>
    ${template.cssContent || ''}
  </style>
</head>
<body>
  ${compiledBody}
  <script>
    ${compiledJs}
  </script>
</body>
</html>`;
  }
}
