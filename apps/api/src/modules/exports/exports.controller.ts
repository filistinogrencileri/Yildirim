import { Controller, Get, Param, ParseUUIDPipe, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import archiver from 'archiver';
import type { Response } from 'express';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { ExportsService } from './exports.service';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function attachment(res: Response, filename: string, mime: string): void {
  res.setHeader('Content-Type', mime);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
}

@Controller('staff/exports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPERVISOR', 'ADMIN')
export class ExportsController {
  constructor(
    private readonly exports: ExportsService,
    private readonly prisma: PrismaService,
  ) {}

  /** Single-student Excel with the photo embedded in the sheet (plan module 8). */
  @Get('student/:studentId.xlsx')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async studentXlsx(
    @CurrentUser() staff: AuthUser,
    @Param('studentId', new ParseUUIDPipe()) studentId: string,
    @Res() res: Response,
  ): Promise<void> {
    await this.exports.assertStudentInScope(staff, studentId);
    const bundle = await this.exports.buildStudentBundle(studentId);
    await this.exports.audit(staff.id, 'export.student', studentId);
    attachment(res, `${bundle.fileNameBase}.xlsx`, XLSX_MIME);
    res.end(bundle.workbook);
  }

  /** Batch ZIP: one folder per student — Excel + photo + every uploaded file. */
  @Get('service/:serviceId.zip')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async serviceZip(
    @CurrentUser() staff: AuthUser,
    @Param('serviceId', new ParseUUIDPipe()) serviceId: string,
    @Res() res: Response,
  ): Promise<void> {
    await this.exports.assertServiceInScope(staff, serviceId);
    const service = await this.prisma.service.findUniqueOrThrow({ where: { id: serviceId } });
    const studentIds = await this.exports.studentsOfService(serviceId);
    await this.exports.audit(staff.id, 'export.service', serviceId, { students: studentIds.length });

    attachment(res, `${service.slug}-export.zip`, 'application/zip');
    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('error', () => res.destroy());
    archive.pipe(res);

    const usedNames = new Set<string>();
    for (const studentId of studentIds) {
      const bundle = await this.exports.buildStudentBundle(studentId);
      let folder = bundle.fileNameBase;
      let n = 2;
      while (usedNames.has(folder)) folder = `${bundle.fileNameBase} (${n++})`;
      usedNames.add(folder);

      archive.append(bundle.workbook, { name: `${folder}/بيانات الطالب.xlsx` });
      if (bundle.photo) {
        archive.append(bundle.photo.buffer, { name: `${folder}/الصورة الشخصية.jpg` });
      }
      const usedDocs = new Set<string>();
      for (const doc of bundle.documents) {
        let name = doc.name;
        let d = 2;
        while (usedDocs.has(name)) name = doc.name.replace(/\.pdf$/, ` (${d++}).pdf`);
        usedDocs.add(name);
        archive.append(this.exports.getFileStream(doc.storageKey), { name: `${folder}/${name}` });
      }
    }
    await archive.finalize();
  }
}
