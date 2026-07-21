import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Workbook } from 'exceljs';
import type { Prisma } from '@prisma/client';
import type { UserRole } from '@yildirim/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

const localize = (v: unknown): string => {
  if (v && typeof v === 'object' && 'ar' in (v as Record<string, unknown>)) {
    return String((v as Record<string, unknown>).ar);
  }
  return v === null || v === undefined ? '' : String(v);
};

const STATUS_AR: Record<string, string> = {
  DRAFT: 'مسودة',
  SUBMITTED: 'بانتظار المراجعة',
  UNDER_REVIEW: 'قيد المراجعة',
  NEEDS_ACTION: 'بحاجة لاستكمال',
  IN_PROGRESS: 'قيد التنفيذ',
  COMPLETED: 'مكتمل',
  CANCELLED: 'ملغى',
};

export interface StudentExportBundle {
  fileNameBase: string;
  workbook: Buffer;
  photo: { buffer: Buffer; name: string } | null;
  documents: Array<{ storageKey: string; name: string }>;
}

@Injectable()
export class ExportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /** Admin sees everyone; a supervisor only students with a request in their services. */
  async assertStudentInScope(staff: { id: string; role: UserRole }, studentId: string): Promise<void> {
    if (staff.role === 'ADMIN') return;
    const count = await this.prisma.request.count({
      where: {
        studentId,
        status: { not: 'CANCELLED' },
        service: { supervisors: { some: { userId: staff.id } } },
      },
    });
    if (count === 0) throw new ForbiddenException('STUDENT_NOT_IN_SCOPE');
  }

  async assertServiceInScope(staff: { id: string; role: UserRole }, serviceId: string): Promise<void> {
    if (staff.role === 'ADMIN') return;
    const row = await this.prisma.serviceSupervisor.findUnique({
      where: { serviceId_userId: { serviceId, userId: staff.id } },
    });
    if (!row) throw new ForbiddenException('SERVICE_NOT_ASSIGNED');
  }

  private async readStorage(storageKey: string): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of this.storage.getStream(storageKey)) {
      chunks.push(chunk as Buffer);
    }
    return Buffer.concat(chunks);
  }

  /** Everything needed to export one student: workbook + photo + document refs. */
  async buildStudentBundle(studentId: string): Promise<StudentExportBundle> {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      include: {
        profilePhotoFile: true,
        referralSourceItem: true,
        fieldValues: {
          include: {
            file: true,
            field: { include: { section: true } },
          },
        },
        requests: {
          where: { status: { not: 'DRAFT' } },
          include: {
            service: { select: { title: true } },
            choices: {
              orderBy: { rank: 'asc' },
              include: { university: true, major: true },
            },
            acceptanceLetterFile: true,
          },
        },
      },
    });
    if (!student || student.role !== 'STUDENT') throw new NotFoundException('STUDENT_NOT_FOUND');

    const wb = new Workbook();
    wb.creator = 'Yıldırım';
    const ws = wb.addWorksheet('الطالب', { views: [{ rightToLeft: true }] });
    ws.columns = [{ width: 28 }, { width: 46 }, { width: 6 }, { width: 18 }];

    // photo embedded top-left (of the RTL sheet) — plan module 8 requires the
    // image inside the file itself
    let photo: StudentExportBundle['photo'] = null;
    if (student.profilePhotoFile) {
      const buffer = await this.readStorage(student.profilePhotoFile.storageKey).catch(() => null);
      if (buffer) {
        photo = { buffer, name: 'photo.jpg' };
        const imageId = wb.addImage({ buffer: buffer as never, extension: 'jpeg' });
        ws.addImage(imageId, { tl: { col: 2.2, row: 0.4 }, ext: { width: 120, height: 120 } });
      }
    }

    const title = ws.getCell('A1');
    title.value = student.fullNameAr;
    title.font = { bold: true, size: 16, color: { argb: 'FF1F2A5C' } };
    ws.getCell('A2').value = student.fullNameEn;
    ws.getCell('A2').font = { color: { argb: 'FF5C6488' } };

    const info: Array<[string, string]> = [
      ['البريد الإلكتروني', student.email],
      ['رقم الهاتف', student.phoneE164],
      ['كيف سمع عنا', student.referralSourceItem ? localize(student.referralSourceItem.label) : '—'],
      ['تاريخ التسجيل', student.createdAt.toISOString().slice(0, 10)],
    ];
    let row = 4;
    for (const [k, v] of info) {
      ws.getCell(`A${row}`).value = k;
      ws.getCell(`A${row}`).font = { bold: true };
      ws.getCell(`B${row}`).value = v;
      row++;
    }

    // profile answers grouped by section (entry 0 + repeatable entries)
    row += 1;
    const sections = new Map<string, { title: string; rows: Array<[string, string]> }>();
    const sorted = [...student.fieldValues].sort(
      (a, b) =>
        a.field.section.sortOrder - b.field.section.sortOrder ||
        a.field.sortOrder - b.field.sortOrder ||
        a.entryIndex - b.entryIndex,
    );
    for (const v of sorted) {
      const key = v.field.section.key;
      if (!sections.has(key)) {
        sections.set(key, { title: localize(v.field.section.title), rows: [] });
      }
      const label =
        localize(v.field.label) + (v.entryIndex > 0 ? ` (${v.entryIndex + 1})` : '');
      const value = v.file ? v.file.originalName : localize(v.value);
      sections.get(key)!.rows.push([label, value]);
    }
    for (const section of sections.values()) {
      const h = ws.getCell(`A${row}`);
      h.value = section.title;
      h.font = { bold: true, size: 12, color: { argb: 'FFB0700A' } };
      row++;
      for (const [k, v] of section.rows) {
        ws.getCell(`A${row}`).value = k;
        ws.getCell(`B${row}`).value = v;
        row++;
      }
      row++;
    }

    // requests summary
    if (student.requests.length > 0) {
      const h = ws.getCell(`A${row}`);
      h.value = 'الطلبات';
      h.font = { bold: true, size: 12, color: { argb: 'FFB0700A' } };
      row++;
      for (const r of student.requests) {
        ws.getCell(`A${row}`).value = `${r.referenceNo} — ${localize(r.service.title)}`;
        const outcome = r.outcome === 'ACCEPTED' ? ' (مقبول)' : r.outcome === 'REJECTED' ? ' (مرفوض)' : '';
        ws.getCell(`B${row}`).value = `${STATUS_AR[r.status] ?? r.status}${outcome}`;
        row++;
        for (const c of r.choices) {
          ws.getCell(`A${row}`).value = `   الرغبة ${c.rank}`;
          ws.getCell(`B${row}`).value = `${localize(c.university.name)} – ${localize(c.major.name)}`;
          row++;
        }
      }
    }

    const workbook = Buffer.from(await wb.xlsx.writeBuffer());

    const documents: StudentExportBundle['documents'] = student.fieldValues
      .filter((v) => v.file)
      .map((v) => ({
        storageKey: v.file!.storageKey,
        name: `${localize(v.field.label)}${v.entryIndex > 0 ? `-${v.entryIndex + 1}` : ''}.pdf`,
      }));
    for (const r of student.requests) {
      if (r.acceptanceLetterFile) {
        documents.push({
          storageKey: r.acceptanceLetterFile.storageKey,
          name: `رسالة القبول - ${r.referenceNo}.pdf`,
        });
      }
    }

    const safeBase = `${student.fullNameEn.replace(/[^A-Za-z0-9 .-]/g, '').trim() || 'student'}`;
    return { fileNameBase: safeBase, workbook, photo, documents };
  }

  /** Students with a non-cancelled request in the service. */
  async studentsOfService(serviceId: string): Promise<string[]> {
    const rows = await this.prisma.request.findMany({
      where: { serviceId, status: { not: 'CANCELLED' } },
      select: { studentId: true },
      distinct: ['studentId'],
    });
    return rows.map((r) => r.studentId);
  }

  getFileStream(storageKey: string) {
    return this.storage.getStream(storageKey);
  }

  audit(actorId: string, action: string, entityId: string, meta?: Prisma.InputJsonValue) {
    return this.prisma.auditLog.create({
      data: { actorId, action, entityType: 'export', entityId, meta },
    });
  }
}
