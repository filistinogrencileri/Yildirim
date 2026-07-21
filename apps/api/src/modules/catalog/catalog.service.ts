import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  listPublished() {
    return this.prisma.service.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        type: true,
        choiceMode: true,
        maxChoices: true,
        deadlineAt: true,
      },
    });
  }

  async getBySlug(slug: string) {
    const service = await this.prisma.service.findUnique({
      where: { slug },
      include: {
        requirements: {
          orderBy: { sortOrder: 'asc' },
          include: {
            field: {
              include: { section: { select: { key: true, title: true } } },
            },
          },
        },
      },
    });
    if (!service || !service.isPublished) throw new NotFoundException('SERVICE_NOT_FOUND');

    const [universities, majors] = service.type === 'UNIVERSITY_PLACEMENT'
      ? await Promise.all([
          this.prisma.university.findMany({ where: { isActive: true }, select: { id: true, name: true, city: true } }),
          this.prisma.major.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
        ])
      : [[], []];

    return {
      id: service.id,
      slug: service.slug,
      title: service.title,
      description: service.description,
      type: service.type,
      choiceMode: service.choiceMode,
      maxChoices: service.maxChoices,
      deadlineAt: service.deadlineAt,
      requirements: service.requirements.map((r) => ({
        fieldId: r.fieldId,
        isRequired: r.isRequired,
        label: r.field.label,
        sectionKey: r.field.section.key,
        sectionTitle: r.field.section.title,
      })),
      universities,
      majors,
    };
  }

  /** Which of the service's required fields the student still hasn't filled. */
  async eligibility(slug: string, userId: string) {
    const service = await this.prisma.service.findUnique({
      where: { slug },
      include: {
        requirements: {
          where: { isRequired: true },
          include: { field: { include: { section: { select: { key: true, title: true } } } } },
        },
      },
    });
    if (!service || !service.isPublished) throw new NotFoundException('SERVICE_NOT_FOUND');

    const [values, user] = await Promise.all([
      this.prisma.profileFieldValue.findMany({
        where: { userId, entryIndex: 0, fieldId: { in: service.requirements.map((r) => r.fieldId) } },
      }),
      this.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    ]);
    const filled = new Set(
      values.filter((v) => v.value !== null || v.fileId !== null).map((v) => v.fieldId),
    );

    const missing = service.requirements
      .filter((r) => !filled.has(r.fieldId))
      .map((r) => ({
        fieldId: r.fieldId,
        fieldKey: r.field.key,
        label: r.field.label,
        sectionKey: r.field.section.key,
        sectionTitle: r.field.section.title,
      }));

    // profile photo is globally required before applying (plan module 2)
    const photoMissing = user.profilePhotoFileId === null;

    const existing = await this.prisma.request.findFirst({
      where: { serviceId: service.id, studentId: userId, status: { not: 'CANCELLED' } },
      select: { id: true, status: true, referenceNo: true },
    });

    return {
      eligible: missing.length === 0 && !photoMissing,
      photoMissing,
      missing,
      existingRequest: existing,
    };
  }
}
