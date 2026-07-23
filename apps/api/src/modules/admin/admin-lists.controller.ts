import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Allow, IsBoolean, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';
import { localizedTextSchema } from '@yildirim/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PrismaService } from '../../prisma/prisma.service';

export class CreateListItemDto {
  @Allow()
  label!: unknown; // {ar, en?}

  @IsString()
  @Matches(/^[a-z0-9_-]{1,60}$/, { message: 'BAD_VALUE' })
  value!: string;
}

export class UpdateListItemDto {
  @IsOptional()
  @Allow()
  label?: unknown;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

/**
 * Minimal admin management for configurable dropdown lists (immigration
 * offices, marital statuses, referral sources, ...). Lists themselves are
 * seeded by key; admins manage their ITEMS here.
 */
@Controller('admin/lists')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminListsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  all() {
    return this.prisma.list.findMany({
      orderBy: { key: 'asc' },
      include: { items: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] } },
    });
  }

  @Post(':listId/items')
  async addItem(@Param('listId', ParseUUIDPipe) listId: string, @Body() dto: CreateListItemDto) {
    const label = localizedTextSchema.safeParse(dto.label);
    if (!label.success) throw new BadRequestException('BAD_LOCALIZED_TEXT');
    const list = await this.prisma.list.findUnique({
      where: { id: listId },
      include: { _count: { select: { items: true } } },
    });
    if (!list) throw new BadRequestException('LIST_NOT_FOUND');
    return this.prisma.listItem.create({
      data: { listId, value: dto.value, label: label.data, sortOrder: list._count.items },
    });
  }

  @Put('items/:itemId')
  async updateItem(@Param('itemId', ParseUUIDPipe) itemId: string, @Body() dto: UpdateListItemDto) {
    let label: object | undefined;
    if (dto.label !== undefined) {
      const parsed = localizedTextSchema.safeParse(dto.label);
      if (!parsed.success) throw new BadRequestException('BAD_LOCALIZED_TEXT');
      label = parsed.data;
    }
    return this.prisma.listItem.update({
      where: { id: itemId },
      data: { label, isActive: dto.isActive, sortOrder: dto.sortOrder },
    });
  }
}
