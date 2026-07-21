import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { LEGAL_TYPES, type LegalType } from '@yildirim/shared';
import { SiteService } from './site.service';
import { SubscribeDto } from './dto/site.dto';

function asLegalType(type: string): LegalType {
  if (!(LEGAL_TYPES as readonly string[]).includes(type)) throw new BadRequestException('BAD_LEGAL_TYPE');
  return type as LegalType;
}

/** Public, unauthenticated site data used by the footer and legal pages. */
@Controller('site')
export class SiteController {
  constructor(private readonly site: SiteService) {}

  @Get('config')
  async config() {
    const [settings, privacy, terms] = await Promise.all([
      this.site.getSettings(),
      this.site.getLegal('privacy'),
      this.site.getLegal('terms'),
    ]);
    return {
      contact: settings.contact,
      social: settings.social,
      newsletterEnabled: settings.newsletterEnabled,
      copyright: settings.copyright,
      legal: {
        privacy: { title: privacy.title, hasPdf: !!privacy.pdfFileId },
        terms: { title: terms.title, hasPdf: !!terms.pdfFileId },
      },
    };
  }

  @Get('legal/:type')
  async legal(@Param('type') type: string) {
    const doc = await this.site.getLegal(asLegalType(type));
    return { title: doc.title, body: doc.body, hasPdf: !!doc.pdfFileId };
  }

  @Get('legal/:type/document.pdf')
  async legalPdf(@Param('type') type: string, @Res() res: Response): Promise<void> {
    const { file, stream } = await this.site.openLegalPdf(asLegalType(type));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `inline; filename="${type}.pdf"`);
    res.setHeader('Cache-Control', 'public, max-age=300');
    void file;
    stream.pipe(res);
  }

  @Post('newsletter')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async subscribe(@Body() dto: SubscribeDto) {
    if (dto.website) return { ok: true }; // honeypot tripped — pretend success
    return this.site.subscribe(dto.email);
  }
}
