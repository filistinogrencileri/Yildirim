import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  DEFAULT_SITE_SETTINGS,
  LEGAL_KEY,
  SITE_SETTINGS_KEY,
  type LegalDocument,
  type LegalType,
  type SiteSettings,
} from '@yildirim/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

const EMPTY_LEGAL: LegalDocument = { title: '', body: '', pdfFileId: null };

@Injectable()
export class SiteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async getSettings(): Promise<SiteSettings> {
    const row = await this.prisma.appSetting.findUnique({ where: { key: SITE_SETTINGS_KEY } });
    // merge over defaults so newly-added keys are always present
    return { ...DEFAULT_SITE_SETTINGS, ...((row?.value as Partial<SiteSettings>) ?? {}) };
  }

  async saveSettings(settings: SiteSettings): Promise<SiteSettings> {
    await this.prisma.appSetting.upsert({
      where: { key: SITE_SETTINGS_KEY },
      update: { value: settings as object },
      create: { key: SITE_SETTINGS_KEY, value: settings as object },
    });
    return settings;
  }

  async getLegal(type: LegalType): Promise<LegalDocument> {
    const row = await this.prisma.appSetting.findUnique({ where: { key: LEGAL_KEY[type] } });
    return { ...EMPTY_LEGAL, ...((row?.value as Partial<LegalDocument>) ?? {}) };
  }

  async saveLegalText(type: LegalType, title: string, body: string): Promise<LegalDocument> {
    const current = await this.getLegal(type);
    const next: LegalDocument = { ...current, title, body };
    await this.prisma.appSetting.upsert({
      where: { key: LEGAL_KEY[type] },
      update: { value: next as object },
      create: { key: LEGAL_KEY[type], value: next as object },
    });
    return next;
  }

  async setLegalPdf(type: LegalType, fileId: string | null): Promise<LegalDocument> {
    const current = await this.getLegal(type);
    // clean up the previous PDF when replacing/removing
    if (current.pdfFileId && current.pdfFileId !== fileId) {
      const old = await this.prisma.storedFile.findUnique({ where: { id: current.pdfFileId } });
      if (old) {
        await this.storage.delete(old.storageKey).catch(() => undefined);
        await this.prisma.storedFile.delete({ where: { id: old.id } }).catch(() => undefined);
      }
    }
    const next: LegalDocument = { ...current, pdfFileId: fileId };
    await this.prisma.appSetting.upsert({
      where: { key: LEGAL_KEY[type] },
      update: { value: next as object },
      create: { key: LEGAL_KEY[type], value: next as object },
    });
    return next;
  }

  /** Streams the legal PDF publicly (intentionally public content). */
  async openLegalPdf(type: LegalType) {
    const doc = await this.getLegal(type);
    if (!doc.pdfFileId) throw new NotFoundException('NO_PDF');
    const file = await this.prisma.storedFile.findUnique({ where: { id: doc.pdfFileId } });
    if (!file) throw new NotFoundException('NO_PDF');
    return { file, stream: this.storage.getStream(file.storageKey) };
  }

  async subscribe(email: string): Promise<{ ok: true }> {
    const normalized = email.toLowerCase().trim();
    await this.prisma.newsletterSubscription
      .upsert({
        where: { email: normalized },
        update: {},
        create: { email: normalized },
      })
      .catch(() => {
        throw new BadRequestException('SUBSCRIBE_FAILED');
      });
    return { ok: true };
  }

  listSubscribers() {
    return this.prisma.newsletterSubscription.findMany({ orderBy: { createdAt: 'desc' }, take: 500 });
  }
}
