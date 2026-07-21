import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FilesService, type UploadedBuffer } from '../files/files.service';
import { validateFieldValue } from './value-validator';

export type SectionState = 'COMPLETE' | 'INCOMPLETE' | 'NOT_REQUIRED';

export interface ValueInput {
  fieldId: string;
  entryIndex?: number;
  value?: unknown;
  fileId?: string | null;
}

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FilesService,
  ) {}

  /** Full profile payload: sections + definitions + the student's values + states. */
  async getMyProfile(userId: string) {
    const [user, sections, values] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      this.prisma.profileSection.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: {
          fields: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
            include: { list: { include: { items: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } } } } },
          },
        },
      }),
      this.prisma.profileFieldValue.findMany({
        where: { userId },
        include: { file: { select: { id: true, originalName: true } } },
      }),
    ]);

    const byField = new Map<string, typeof values>();
    for (const v of values) {
      const list = byField.get(v.fieldId) ?? [];
      list.push(v);
      byField.set(v.fieldId, list);
    }

    let requiredTotal = 0;
    let requiredFilled = 0;
    const missing: Array<{ sectionKey: string; fieldKey: string; label: unknown }> = [];

    const sectionPayloads = sections.map((s) => {
      const maxEntry = Math.max(
        0,
        ...s.fields.flatMap((f) => (byField.get(f.id) ?? []).map((v) => v.entryIndex)),
      );
      const entryCount = s.isRepeatable ? maxEntry + 1 : 1;

      let sectionRequired = 0;
      let sectionFilled = 0;
      for (const f of s.fields) {
        if (!f.isRequiredForProfile) continue;
        sectionRequired++;
        requiredTotal++;
        const filled = (byField.get(f.id) ?? []).some(
          (v) => v.entryIndex === 0 && (v.value !== null || v.fileId !== null),
        );
        if (filled) {
          sectionFilled++;
          requiredFilled++;
        } else {
          missing.push({ sectionKey: s.key, fieldKey: f.key, label: f.label });
        }
      }

      const state: SectionState =
        sectionRequired === 0 ? 'NOT_REQUIRED' : sectionFilled === sectionRequired ? 'COMPLETE' : 'INCOMPLETE';

      return {
        id: s.id,
        key: s.key,
        title: s.title,
        isRepeatable: s.isRepeatable,
        state,
        fields: s.fields.map((f) => ({
          id: f.id,
          key: f.key,
          label: f.label,
          helpText: f.helpText,
          type: f.type,
          isRequired: f.isRequiredForProfile,
          validation: f.validation,
          options: f.list?.items.map((i) => ({ value: i.value, label: i.label })) ?? null,
        })),
        entries: Array.from({ length: entryCount }, (_, entryIndex) => {
          const entryValues: Record<
            string,
            { value: unknown; fileId: string | null; fileName?: string; fileUrl?: string }
          > = {};
          for (const f of s.fields) {
            const v = (byField.get(f.id) ?? []).find((x) => x.entryIndex === entryIndex);
            if (v && (v.value !== null || v.fileId !== null)) {
              entryValues[f.key] = {
                value: v.value,
                fileId: v.fileId,
                ...(v.file
                  ? { fileName: v.file.originalName, fileUrl: this.files.signUrl(v.file.id, userId) }
                  : {}),
              };
            }
          }
          return { entryIndex, values: entryValues };
        }),
      };
    });

    // profile photo participates in overall completeness (it is required — plan module 2)
    const photoFilled = user.profilePhotoFileId !== null;
    requiredTotal++;
    if (photoFilled) requiredFilled++;
    else missing.unshift({ sectionKey: 'photo', fieldKey: 'profile_photo', label: { ar: 'الصورة الشخصية' } });

    return {
      photo: user.profilePhotoFileId
        ? { fileId: user.profilePhotoFileId, url: this.files.signUrl(user.profilePhotoFileId, userId) }
        : null,
      sections: sectionPayloads,
      completeness: {
        percent: requiredTotal === 0 ? 100 : Math.round((requiredFilled / requiredTotal) * 100),
        requiredTotal,
        requiredFilled,
        missing,
      },
    };
  }

  async saveValues(userId: string, inputs: ValueInput[]) {
    if (inputs.length === 0 || inputs.length > 100) throw new BadRequestException('BAD_BATCH');
    const fieldIds = [...new Set(inputs.map((i) => i.fieldId))];
    const fields = await this.prisma.fieldDefinition.findMany({
      where: { id: { in: fieldIds }, isActive: true },
      include: { section: true, list: { include: { items: true } } },
    });
    const fieldMap = new Map(fields.map((f) => [f.id, f]));

    const ops = [];
    for (const input of inputs) {
      const field = fieldMap.get(input.fieldId);
      if (!field) throw new NotFoundException(`FIELD_NOT_FOUND:${input.fieldId}`);
      const entryIndex = input.entryIndex ?? 0;
      if (entryIndex !== 0 && !field.section.isRepeatable) throw new BadRequestException('NOT_REPEATABLE');
      if (entryIndex < 0 || entryIndex > 20) throw new BadRequestException('BAD_ENTRY_INDEX');

      let value: unknown = null;
      let fileId: string | null = null;

      if (field.type === 'FILE_PDF' || field.type === 'FILE_IMAGE') {
        if (input.fileId) {
          const file = await this.prisma.storedFile.findUnique({ where: { id: input.fileId } });
          if (!file || file.ownerUserId !== userId) throw new ForbiddenException('NOT_YOUR_FILE');
          fileId = file.id;
        }
      } else {
        value = validateFieldValue(field, input.value);
      }

      const isEmpty = value === null && fileId === null;
      ops.push(
        isEmpty
          ? this.prisma.profileFieldValue.deleteMany({
              where: { userId, fieldId: field.id, entryIndex },
            })
          : this.prisma.profileFieldValue.upsert({
              where: { userId_fieldId_entryIndex: { userId, fieldId: field.id, entryIndex } },
              update: { value: value as never, fileId },
              create: { userId, fieldId: field.id, entryIndex, value: value as never, fileId },
            }),
      );
    }
    await this.prisma.$transaction(ops);
    return this.getMyProfile(userId);
  }

  /** Deletes one entry of a repeatable section and compacts higher indexes. */
  async deleteEntry(userId: string, sectionId: string, entryIndex: number) {
    const section = await this.prisma.profileSection.findUnique({
      where: { id: sectionId },
      include: { fields: { select: { id: true } } },
    });
    if (!section) throw new NotFoundException('SECTION_NOT_FOUND');
    if (!section.isRepeatable) throw new BadRequestException('NOT_REPEATABLE');
    const fieldIds = section.fields.map((f) => f.id);

    await this.prisma.$transaction(async (tx) => {
      await tx.profileFieldValue.deleteMany({
        where: { userId, fieldId: { in: fieldIds }, entryIndex },
      });
      await tx.profileFieldValue.updateMany({
        where: { userId, fieldId: { in: fieldIds }, entryIndex: { gt: entryIndex } },
        data: { entryIndex: { decrement: 1 } },
      });
    });
    return this.getMyProfile(userId);
  }

  async setPhoto(userId: string, file: UploadedBuffer) {
    const stored = await this.files.storeProfilePhoto(userId, file);
    await this.prisma.user.update({
      where: { id: userId },
      data: { profilePhotoFileId: stored.id },
    });
    return { fileId: stored.id, url: this.files.signUrl(stored.id, userId) };
  }

  /** Uploads a document for a FILE_PDF/FILE_IMAGE field and links it in one step. */
  async uploadDocument(userId: string, fieldId: string, entryIndex: number, file: UploadedBuffer) {
    const field = await this.prisma.fieldDefinition.findUnique({
      where: { id: fieldId },
      include: { section: true },
    });
    if (!field || !field.isActive) throw new NotFoundException('FIELD_NOT_FOUND');
    if (field.type !== 'FILE_PDF' && field.type !== 'FILE_IMAGE') {
      throw new BadRequestException('NOT_A_FILE_FIELD');
    }
    if (entryIndex !== 0 && !field.section.isRepeatable) throw new BadRequestException('NOT_REPEATABLE');

    const rules = (field.validation ?? {}) as { maxSizeMb?: number };
    const stored =
      field.type === 'FILE_PDF'
        ? await this.files.storePdf(userId, file, { kind: 'DOCUMENT', maxSizeMb: rules.maxSizeMb })
        : await this.files.storeProfilePhoto(userId, file); // FILE_IMAGE fields reuse the image pipeline

    await this.prisma.profileFieldValue.upsert({
      where: { userId_fieldId_entryIndex: { userId, fieldId, entryIndex } },
      update: { fileId: stored.id, value: undefined },
      create: { userId, fieldId, entryIndex, fileId: stored.id },
    });
    return {
      fileId: stored.id,
      fileName: stored.originalName,
      fileUrl: this.files.signUrl(stored.id, userId),
    };
  }
}
