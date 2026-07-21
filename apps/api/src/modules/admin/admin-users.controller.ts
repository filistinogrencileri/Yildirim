import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import * as argon2 from 'argon2';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PrismaService } from '../../prisma/prisma.service';

export class CreateSupervisorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullNameAr!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(/^[A-Za-z\s.'-]+$/, { message: 'FULL_NAME_EN_LATIN_ONLY' })
  fullNameEn!: string;

  @IsEmail()
  email!: string;

  @Matches(/^\+[1-9]\d{7,14}$/, { message: 'INVALID_PHONE_E164' })
  phone!: string;

  @IsString()
  @MinLength(8, { message: 'PASSWORD_TOO_SHORT' })
  @MaxLength(72)
  password!: string;
}

/** Supervisors never self-register — admin creates their accounts here. */
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminUsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('supervisors')
  listSupervisors() {
    return this.prisma.user.findMany({
      where: { role: 'SUPERVISOR' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fullNameAr: true,
        fullNameEn: true,
        email: true,
        phoneE164: true,
        status: true,
        createdAt: true,
        serviceAssignments: {
          select: { service: { select: { id: true, title: true } } },
        },
      },
    });
  }

  @Post('supervisors')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async createSupervisor(@Body() dto: CreateSupervisorDto) {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('EMAIL_TAKEN');
    if (!dto.fullNameAr.trim()) throw new BadRequestException('NAME_REQUIRED');

    const user = await this.prisma.user.create({
      data: {
        email,
        phoneE164: dto.phone,
        passwordHash: await argon2.hash(dto.password, { type: argon2.argon2id }),
        fullNameAr: dto.fullNameAr.trim(),
        fullNameEn: dto.fullNameEn.trim(),
        role: 'SUPERVISOR',
        emailVerifiedAt: new Date(), // staff accounts skip email verification
      },
      select: { id: true, fullNameAr: true, email: true },
    });
    return user;
  }
}
