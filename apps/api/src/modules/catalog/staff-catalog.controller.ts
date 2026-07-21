import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PrismaService } from '../../prisma/prisma.service';

/** Services in the staff member's scope, with per-status request counts. */
@Controller('staff/services')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPERVISOR', 'ADMIN')
export class StaffCatalogController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const services = await this.prisma.service.findMany({
      where:
        user.role === 'ADMIN'
          ? {}
          : { supervisors: { some: { userId: user.id } } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, slug: true, title: true, type: true, isPublished: true },
    });

    const counts = await this.prisma.request.groupBy({
      by: ['serviceId', 'status'],
      where: {
        serviceId: { in: services.map((s) => s.id) },
        status: { not: 'DRAFT' },
      },
      _count: true,
    });

    return services.map((s) => {
      const byStatus: Record<string, number> = {};
      let total = 0;
      for (const c of counts) {
        if (c.serviceId === s.id) {
          byStatus[c.status] = c._count;
          total += c._count;
        }
      }
      return { ...s, requestCounts: byStatus, requestTotal: total };
    });
  }
}
