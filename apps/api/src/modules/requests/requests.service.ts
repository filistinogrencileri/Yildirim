import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, RequestStatus } from '@prisma/client';
import {
  canTransition,
  REQUEST_REFERENCE_PREFIX,
  type RequestOutcome,
  type UserRole,
} from '@yildirim/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { FilesService, type UploadedBuffer } from '../files/files.service';
import { CatalogService } from '../catalog/catalog.service';
import { validateFieldValue } from '../profile/value-validator';

export interface ChoiceInput {
  universityId: string;
  majorId: string;
}

const requestInclude = {
  service: { select: { id: true, slug: true, title: true, type: true, choiceMode: true, config: true } },
  choices: {
    orderBy: { rank: 'asc' },
    include: {
      university: { select: { id: true, name: true, city: true } },
      major: { select: { id: true, name: true } },
    },
  },
  history: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.RequestInclude;

@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FilesService,
    private readonly catalog: CatalogService,
  ) {}

  // ── student side ──────────────────────────────────────────────────────────

  /** Creates the request and submits it in one step (freezing the snapshot). */
  async apply(
    userId: string,
    serviceSlug: string,
    choices: ChoiceInput[],
    extraAnswers: Record<string, unknown> = {},
  ) {
    const service = await this.prisma.service.findUnique({
      where: { slug: serviceSlug },
      include: {
        extraFields: {
          orderBy: { sortOrder: 'asc' },
          include: { list: { include: { items: true } } },
        },
      },
    });
    if (!service || !service.isPublished) throw new NotFoundException('SERVICE_NOT_FOUND');
    if (service.deadlineAt && service.deadlineAt < new Date()) {
      throw new BadRequestException('DEADLINE_PASSED');
    }

    const eligibility = await this.catalog.eligibility(serviceSlug, userId);
    if (eligibility.existingRequest) throw new BadRequestException('ALREADY_APPLIED');
    if (!eligibility.eligible) throw new BadRequestException('PROFILE_INCOMPLETE');

    if (service.type === 'UNIVERSITY_PLACEMENT') {
      const max = service.choiceMode === 'SINGLE' ? 1 : service.maxChoices;
      if (choices.length < 1 || choices.length > max) throw new BadRequestException('BAD_CHOICE_COUNT');
      const dedup = new Set(choices.map((c) => `${c.universityId}:${c.majorId}`));
      if (dedup.size !== choices.length) throw new BadRequestException('DUPLICATE_CHOICE');
      const [uniCount, majorCount] = await Promise.all([
        this.prisma.university.count({
          where: { id: { in: choices.map((c) => c.universityId) }, isActive: true },
        }),
        this.prisma.major.count({
          where: { id: { in: choices.map((c) => c.majorId) }, isActive: true },
        }),
      ]);
      if (uniCount !== new Set(choices.map((c) => c.universityId)).size) throw new BadRequestException('BAD_UNIVERSITY');
      if (majorCount !== new Set(choices.map((c) => c.majorId)).size) throw new BadRequestException('BAD_MAJOR');
    } else if (choices.length > 0) {
      throw new BadRequestException('CHOICES_NOT_ALLOWED');
    }

    // service-scoped one-time questions: validate against the service's own
    // extra-field definitions (same per-type rules as profile fields)
    const validatedExtras: Array<{
      key: string;
      label: unknown;
      type: string;
      value: unknown;
      display?: unknown;
    }> = [];
    for (const field of service.extraFields) {
      const value = validateFieldValue(field, extraAnswers[field.key]);
      if (field.isRequired && value === null) {
        throw new BadRequestException(`EXTRA_FIELD_REQUIRED:${field.key}`);
      }
      // freeze the human-readable option label alongside the raw SELECT value
      const display =
        field.type === 'SELECT' && value
          ? (field.list?.items.find((i) => i.value === value)?.label ?? value)
          : undefined;
      validatedExtras.push({ key: field.key, label: field.label, type: field.type, value, display });
    }

    const snapshot = await this.buildSnapshot(userId, service.id);
    if (validatedExtras.length > 0) {
      (snapshot as Record<string, unknown>).extraAnswers = validatedExtras;
    }

    const request = await this.prisma.$transaction(async (tx) => {
      const referenceNo = await this.nextReference(tx);
      const created = await tx.request.create({
        data: {
          referenceNo,
          serviceId: service.id,
          studentId: userId,
          status: 'SUBMITTED',
          submittedAt: new Date(),
          answersSnapshot: snapshot as Prisma.InputJsonValue,
          choices: {
            create: choices.map((c, i) => ({
              rank: i + 1,
              universityId: c.universityId,
              majorId: c.majorId,
            })),
          },
        },
        include: requestInclude,
      });
      await tx.requestStatusHistory.create({
        data: { requestId: created.id, fromStatus: null, toStatus: 'SUBMITTED', changedByUserId: userId },
      });
      return created;
    });

    // notify assigned supervisors
    const supervisors = await this.prisma.serviceSupervisor.findMany({ where: { serviceId: service.id } });
    if (supervisors.length > 0) {
      await this.prisma.notification.createMany({
        data: supervisors.map((s) => ({
          userId: s.userId,
          type: 'request.submitted',
          title: { ar: 'طلب جديد بانتظار المراجعة' },
          body: { ar: `طلب جديد رقم ${request.referenceNo}` },
          data: { requestId: request.id },
        })),
      });
    }

    return this.presentForStudent(request, userId);
  }

  private async buildSnapshot(userId: string, serviceId: string) {
    const [requirements, values, user] = await Promise.all([
      this.prisma.serviceRequirement.findMany({
        where: { serviceId },
        include: { field: { select: { key: true, label: true, type: true } } },
      }),
      this.prisma.profileFieldValue.findMany({
        where: { userId },
        include: { file: { select: { id: true, originalName: true } } },
      }),
      this.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    ]);
    const byField = new Map(values.filter((v) => v.entryIndex === 0).map((v) => [v.fieldId, v]));
    return {
      takenAt: new Date().toISOString(),
      student: {
        fullNameAr: user.fullNameAr,
        fullNameEn: user.fullNameEn,
        email: user.email,
        phone: user.phoneE164,
        photoFileId: user.profilePhotoFileId,
      },
      answers: requirements.map((r) => {
        const v = byField.get(r.fieldId);
        return {
          fieldKey: r.field.key,
          label: r.field.label,
          type: r.field.type,
          value: v?.value ?? null,
          fileId: v?.fileId ?? null,
          fileName: v?.file?.originalName ?? null,
        };
      }),
    };
  }

  private async nextReference(tx: Prisma.TransactionClient): Promise<string> {
    const year = new Date().getFullYear();
    const count = await tx.request.count({
      where: { createdAt: { gte: new Date(`${year}-01-01`) } },
    });
    return `${REQUEST_REFERENCE_PREFIX}-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  async myRequests(userId: string) {
    const requests = await this.prisma.request.findMany({
      where: { studentId: userId },
      orderBy: { createdAt: 'desc' },
      include: requestInclude,
    });
    return requests.map((r) => this.presentForStudent(r, userId));
  }

  async myRequest(userId: string, id: string) {
    const request = await this.prisma.request.findUnique({ where: { id }, include: requestInclude });
    if (!request || request.studentId !== userId) throw new NotFoundException('REQUEST_NOT_FOUND');
    return this.presentForStudent(request, userId);
  }

  private presentForStudent(
    r: Prisma.RequestGetPayload<{ include: typeof requestInclude }>,
    userId: string,
  ) {
    const snapshot = r.answersSnapshot as { extraAnswers?: unknown[] } | null;
    return {
      id: r.id,
      referenceNo: r.referenceNo,
      service: r.service,
      outcomeKind: (r.service.config as { outcomeKind?: string } | null)?.outcomeKind ?? null,
      status: r.status,
      outcome: r.outcome,
      outcomeData: r.outcomeData,
      submittedAt: r.submittedAt,
      decidedAt: r.decidedAt,
      choices: r.choices,
      acceptedChoiceId: r.acceptedChoiceId,
      acceptanceLetterUrl: r.acceptanceLetterFileId
        ? this.files.signUrl(r.acceptanceLetterFileId, userId)
        : null,
      extraAnswers: snapshot?.extraAnswers ?? [],
      history: r.history.map((h) => ({
        toStatus: h.toStatus,
        note: h.note,
        at: h.createdAt,
      })),
      createdAt: r.createdAt,
    };
  }

  /** Student fixes their profile then resubmits a NEEDS_ACTION request. */
  async resubmit(userId: string, id: string) {
    const request = await this.prisma.request.findUnique({ where: { id } });
    if (!request || request.studentId !== userId) throw new NotFoundException('REQUEST_NOT_FOUND');
    if (!canTransition(request.status, 'UNDER_REVIEW', 'STUDENT')) {
      throw new BadRequestException('INVALID_TRANSITION');
    }
    const snapshot = await this.buildSnapshot(userId, request.serviceId);
    // preserve the one-time service answers frozen at the original apply
    const previous = request.answersSnapshot as { extraAnswers?: unknown[] } | null;
    if (previous?.extraAnswers) {
      (snapshot as Record<string, unknown>).extraAnswers = previous.extraAnswers;
    }
    await this.prisma.$transaction([
      this.prisma.request.update({
        where: { id },
        data: { status: 'UNDER_REVIEW', answersSnapshot: snapshot as Prisma.InputJsonValue },
      }),
      this.prisma.requestStatusHistory.create({
        data: { requestId: id, fromStatus: request.status, toStatus: 'UNDER_REVIEW', changedByUserId: userId },
      }),
    ]);
    return this.myRequest(userId, id);
  }

  async cancel(userId: string, id: string) {
    const request = await this.prisma.request.findUnique({ where: { id } });
    if (!request || request.studentId !== userId) throw new NotFoundException('REQUEST_NOT_FOUND');
    if (!canTransition(request.status, 'CANCELLED', 'STUDENT')) {
      throw new BadRequestException('INVALID_TRANSITION');
    }
    await this.prisma.$transaction([
      this.prisma.request.update({ where: { id }, data: { status: 'CANCELLED' } }),
      this.prisma.requestStatusHistory.create({
        data: { requestId: id, fromStatus: request.status, toStatus: 'CANCELLED', changedByUserId: userId },
      }),
    ]);
    return this.myRequest(userId, id);
  }

  // ── staff side ────────────────────────────────────────────────────────────

  /** Service ids a staff member may touch; null = unrestricted (admin). */
  private async scopeFor(user: { id: string; role: UserRole }): Promise<string[] | null> {
    if (user.role === 'ADMIN') return null;
    const rows = await this.prisma.serviceSupervisor.findMany({ where: { userId: user.id } });
    return rows.map((r) => r.serviceId);
  }

  async queue(
    user: { id: string; role: UserRole },
    filter: { serviceId?: string; status?: RequestStatus },
  ) {
    const scope = await this.scopeFor(user);
    if (scope !== null && filter.serviceId && !scope.includes(filter.serviceId)) {
      throw new ForbiddenException('SERVICE_NOT_ASSIGNED');
    }
    return this.prisma.request.findMany({
      where: {
        status: filter.status ?? undefined,
        serviceId: filter.serviceId ?? (scope !== null ? { in: scope } : undefined),
        NOT: { status: 'DRAFT' },
      },
      orderBy: { submittedAt: 'asc' },
      include: {
        service: { select: { id: true, slug: true, title: true, type: true } },
        student: { select: { id: true, fullNameAr: true, email: true, phoneE164: true } },
      },
    });
  }

  async getForStaff(user: { id: string; role: UserRole }, id: string) {
    const request = await this.prisma.request.findUnique({
      where: { id },
      include: {
        ...requestInclude,
        student: {
          select: {
            id: true,
            fullNameAr: true,
            fullNameEn: true,
            email: true,
            phoneE164: true,
            profilePhotoFileId: true,
          },
        },
      },
    });
    if (!request) throw new NotFoundException('REQUEST_NOT_FOUND');
    const scope = await this.scopeFor(user);
    if (scope !== null && !scope.includes(request.serviceId)) {
      throw new ForbiddenException('SERVICE_NOT_ASSIGNED');
    }

    const snapshot = request.answersSnapshot as {
      answers?: Array<{ fileId?: string | null }>;
      extraAnswers?: unknown[];
    } | null;
    // sign document URLs inside the snapshot for the reviewer
    const answers = (snapshot?.answers ?? []).map((a) => ({
      ...a,
      fileUrl: a.fileId ? this.files.signUrl(a.fileId, user.id) : null,
    }));

    return {
      id: request.id,
      referenceNo: request.referenceNo,
      service: request.service,
      outcomeKind: (request.service.config as { outcomeKind?: string } | null)?.outcomeKind ?? null,
      status: request.status,
      outcome: request.outcome,
      outcomeData: request.outcomeData,
      extraAnswers: snapshot?.extraAnswers ?? [],
      submittedAt: request.submittedAt,
      decidedAt: request.decidedAt,
      student: {
        ...request.student,
        photoUrl: request.student.profilePhotoFileId
          ? this.files.signUrl(request.student.profilePhotoFileId, user.id)
          : null,
        whatsapp: `https://wa.me/${request.student.phoneE164.replace('+', '')}`,
      },
      choices: request.choices,
      acceptedChoiceId: request.acceptedChoiceId,
      acceptanceLetterUrl: request.acceptanceLetterFileId
        ? this.files.signUrl(request.acceptanceLetterFileId, user.id)
        : null,
      answers,
      history: request.history,
    };
  }

  async transition(
    user: { id: string; role: UserRole },
    id: string,
    input: {
      to: RequestStatus;
      note?: string;
      outcome?: RequestOutcome;
      acceptedChoiceId?: string;
      outcomeData?: { office: string; appointmentAt: string; note?: string };
    },
  ) {
    const request = await this.prisma.request.findUnique({
      where: { id },
      include: { service: true, choices: true },
    });
    if (!request) throw new NotFoundException('REQUEST_NOT_FOUND');
    const scope = await this.scopeFor(user);
    if (scope !== null && !scope.includes(request.serviceId)) {
      throw new ForbiddenException('SERVICE_NOT_ASSIGNED');
    }

    if (!canTransition(request.status, input.to, user.role)) {
      throw new BadRequestException('INVALID_TRANSITION');
    }
    if (input.to === 'NEEDS_ACTION' && !input.note?.trim()) {
      throw new BadRequestException('NOTE_REQUIRED');
    }

    const data: Prisma.RequestUpdateInput = { status: input.to };

    const outcomeKind = (request.service.config as { outcomeKind?: string } | null)?.outcomeKind;

    if (input.to === 'COMPLETED') {
      if (request.service.type === 'UNIVERSITY_PLACEMENT') {
        if (!input.outcome) throw new BadRequestException('OUTCOME_REQUIRED');
        if (input.outcome === 'ACCEPTED') {
          if (!input.acceptedChoiceId) throw new BadRequestException('ACCEPTED_CHOICE_REQUIRED');
          if (!request.choices.some((c) => c.id === input.acceptedChoiceId)) {
            throw new BadRequestException('CHOICE_NOT_IN_REQUEST');
          }
          if (!request.acceptanceLetterFileId) {
            throw new BadRequestException('ACCEPTANCE_LETTER_REQUIRED');
          }
          data.acceptedChoice = { connect: { id: input.acceptedChoiceId } };
        }
        data.outcome = input.outcome;
      } else if (outcomeKind === 'APPOINTMENT') {
        // appointment-booking services: an accepted completion must carry the
        // confirmed appointment (office + datetime), mirroring the placement
        // letter invariant
        if (!input.outcome) throw new BadRequestException('OUTCOME_REQUIRED');
        if (input.outcome === 'ACCEPTED') {
          const od = input.outcomeData;
          if (!od?.office?.trim() || !od?.appointmentAt || isNaN(Date.parse(od.appointmentAt))) {
            throw new BadRequestException('APPOINTMENT_DETAILS_REQUIRED');
          }
          data.outcomeData = {
            office: od.office.trim(),
            appointmentAt: od.appointmentAt,
            ...(od.note?.trim() ? { note: od.note.trim() } : {}),
          } as Prisma.InputJsonValue;
        }
        data.outcome = input.outcome;
      } else {
        data.outcome = input.outcome ?? null;
      }
      data.decidedAt = new Date();
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.request.update({ where: { id }, data }),
      this.prisma.requestStatusHistory.create({
        data: {
          requestId: id,
          fromStatus: request.status,
          toStatus: input.to,
          changedByUserId: user.id,
          note: input.note?.trim() || null,
        },
      }),
      this.prisma.notification.create({
        data: {
          userId: request.studentId,
          type: 'request.status_changed',
          title: { ar: 'تحدّثت حالة طلبك' },
          body: { ar: `طلبك ${request.referenceNo} أصبح بحالة جديدة.` },
          data: { requestId: id, status: input.to },
        },
      }),
      this.prisma.auditLog.create({
        data: {
          actorId: user.id,
          action: 'request.transition',
          entityType: 'request',
          entityId: id,
          meta: { from: request.status, to: input.to, outcome: input.outcome ?? null },
        },
      }),
    ]);
    return updated;
  }

  /** Supervisor/admin uploads the official acceptance letter (PDF). */
  async attachAcceptanceLetter(user: { id: string; role: UserRole }, id: string, file: UploadedBuffer) {
    const request = await this.prisma.request.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('REQUEST_NOT_FOUND');
    const scope = await this.scopeFor(user);
    if (scope !== null && !scope.includes(request.serviceId)) {
      throw new ForbiddenException('SERVICE_NOT_ASSIGNED');
    }
    if (request.status === 'COMPLETED' || request.status === 'CANCELLED') {
      throw new BadRequestException('REQUEST_ALREADY_CLOSED');
    }

    const stored = await this.files.storePdf(user.id, file, { kind: 'ACCEPTANCE_LETTER', maxSizeMb: 15 });
    await this.prisma.request.update({
      where: { id },
      data: { acceptanceLetterFileId: stored.id },
    });
    return { fileId: stored.id, fileName: stored.originalName };
  }
}
