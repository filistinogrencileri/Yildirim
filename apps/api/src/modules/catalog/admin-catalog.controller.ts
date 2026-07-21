import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { localizedTextSchema } from '@yildirim/shared';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AssignSupervisorDto,
  SetPublishedDto,
  SetRequirementsDto,
  UpsertServiceDto,
} from './dto/admin-service.dto';

@Controller('admin/services')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminCatalogController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.service.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        supervisors: { include: { user: { select: { id: true, fullNameAr: true, email: true } } } },
        requirements: { select: { fieldId: true, isRequired: true } },
        _count: { select: { requests: true, requirements: true } },
      },
    });
  }

  @Post()
  create(@Body() dto: UpsertServiceDto) {
    return this.prisma.service.create({ data: this.toData(dto) });
  }

  @Put(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpsertServiceDto) {
    await this.prisma.service.findUniqueOrThrow({ where: { id } });
    return this.prisma.service.update({ where: { id }, data: this.toData(dto) });
  }

  private toData(dto: UpsertServiceDto) {
    const title = localizedTextSchema.safeParse(dto.title);
    const description = localizedTextSchema.safeParse(dto.description);
    if (!title.success || !description.success) throw new BadRequestException('BAD_LOCALIZED_TEXT');
    return {
      slug: dto.slug,
      title: title.data,
      description: description.data,
      type: dto.type,
      choiceMode: dto.choiceMode,
      maxChoices: dto.choiceMode === 'SINGLE' ? 1 : dto.maxChoices,
      deadlineAt: dto.deadlineAt ? new Date(dto.deadlineAt) : null,
    };
  }

  @Put(':id/published')
  async setPublished(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetPublishedDto) {
    return this.prisma.service.update({
      where: { id },
      data: {
        isPublished: dto.isPublished,
        publishedAt: dto.isPublished ? new Date() : null,
      },
    });
  }

  @Put(':id/requirements')
  async setRequirements(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetRequirementsDto) {
    const fieldIds = dto.requirements.map((r) => r.fieldId);
    const found = await this.prisma.fieldDefinition.count({ where: { id: { in: fieldIds } } });
    if (found !== new Set(fieldIds).size) throw new BadRequestException('UNKNOWN_FIELD');

    await this.prisma.$transaction([
      this.prisma.serviceRequirement.deleteMany({ where: { serviceId: id } }),
      this.prisma.serviceRequirement.createMany({
        data: dto.requirements.map((r, i) => ({
          serviceId: id,
          fieldId: r.fieldId,
          isRequired: r.isRequired,
          sortOrder: i,
        })),
      }),
    ]);
    return this.prisma.serviceRequirement.findMany({ where: { serviceId: id } });
  }

  @Post(':id/supervisors')
  async assignSupervisor(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignSupervisorDto,
    @CurrentUser() admin: AuthUser,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user || user.role !== 'SUPERVISOR') throw new BadRequestException('NOT_A_SUPERVISOR');
    return this.prisma.serviceSupervisor.upsert({
      where: { serviceId_userId: { serviceId: id, userId: dto.userId } },
      update: {},
      create: { serviceId: id, userId: dto.userId, assignedByUserId: admin.id },
    });
  }

  @Delete(':id/supervisors/:userId')
  removeSupervisor(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.prisma.serviceSupervisor.deleteMany({ where: { serviceId: id, userId } });
  }

  /** Master field catalog (profile sections + fields) for the requirements picker. */
  @Get('fields/catalog')
  fieldsCatalog() {
    return this.prisma.profileSection.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        key: true,
        title: true,
        fields: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          select: { id: true, key: true, label: true, type: true, isRequiredForProfile: true },
        },
      },
    });
  }

  /** Assigns every active supervisor to the service in one action. */
  @Post(':id/supervisors/all')
  async assignAllSupervisors(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() admin: AuthUser) {
    const supervisors = await this.prisma.user.findMany({
      where: { role: 'SUPERVISOR', status: 'ACTIVE' },
      select: { id: true },
    });
    await this.prisma.$transaction(
      supervisors.map((s) =>
        this.prisma.serviceSupervisor.upsert({
          where: { serviceId_userId: { serviceId: id, userId: s.id } },
          update: {},
          create: { serviceId: id, userId: s.id, assignedByUserId: admin.id },
        }),
      ),
    );
    return { assigned: supervisors.length };
  }

  @Get('supervisors/available')
  availableSupervisors(@Query('q') q?: string) {
    return this.prisma.user.findMany({
      where: {
        role: 'SUPERVISOR',
        status: 'ACTIVE',
        ...(q
          ? { OR: [{ fullNameAr: { contains: q } }, { email: { contains: q.toLowerCase() } }] }
          : {}),
      },
      select: { id: true, fullNameAr: true, email: true },
      take: 20,
    });
  }
}
