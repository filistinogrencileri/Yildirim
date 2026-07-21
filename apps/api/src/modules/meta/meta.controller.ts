import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/** Public read-only reference data (configurable lists) used by pre-auth UI. */
@Controller('meta')
export class MetaController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('lists/:key')
  async list(@Param('key') key: string) {
    const list = await this.prisma.list.findUnique({
      where: { key },
      include: {
        items: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!list) throw new NotFoundException('LIST_NOT_FOUND');
    return {
      key: list.key,
      name: list.name,
      items: list.items.map((i) => ({ id: i.id, value: i.value, label: i.label })),
    };
  }
}
