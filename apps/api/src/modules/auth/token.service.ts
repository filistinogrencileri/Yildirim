import { createHash, randomBytes, randomUUID } from 'crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import type { Env } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: 'STUDENT' | 'SUPERVISOR' | 'ADMIN';
}

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
  ) {}

  signAccessToken(user: Pick<User, 'id' | 'email' | 'role'>): string {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    return this.jwt.sign(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      expiresIn: this.config.get('JWT_ACCESS_TTL_SEC', { infer: true }),
    });
  }

  refreshTtlMs(): number {
    return this.config.get('REFRESH_TTL_DAYS', { infer: true }) * 24 * 60 * 60 * 1000;
  }

  async issueRefreshToken(
    userId: string,
    opts: { familyId?: string; userAgent?: string; ip?: string },
  ): Promise<string> {
    const raw = randomBytes(48).toString('hex');
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: sha256(raw),
        familyId: opts.familyId ?? randomUUID(),
        expiresAt: new Date(Date.now() + this.refreshTtlMs()),
        userAgent: opts.userAgent?.slice(0, 300),
        ip: opts.ip,
      },
    });
    return raw;
  }

  /**
   * Rotation with reuse detection: a presented token that was already rotated
   * (revoked) means the token leaked — the whole family is revoked.
   */
  async rotateRefreshToken(
    raw: string,
    opts: { userAgent?: string; ip?: string },
  ): Promise<{ user: User; refreshToken: string }> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(raw) },
      include: { user: true },
    });
    if (!stored) throw new UnauthorizedException('INVALID_REFRESH_TOKEN');

    if (stored.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { familyId: stored.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('REFRESH_TOKEN_REUSED');
    }
    if (stored.expiresAt < new Date()) throw new UnauthorizedException('REFRESH_TOKEN_EXPIRED');
    if (stored.user.status !== 'ACTIVE') throw new UnauthorizedException('ACCOUNT_SUSPENDED');

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    const refreshToken = await this.issueRefreshToken(stored.userId, {
      familyId: stored.familyId,
      ...opts,
    });
    return { user: stored.user, refreshToken };
  }

  async revokeRefreshToken(raw: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(raw), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Kills every other session (used after a password change). */
  async revokeAllForUserExcept(userId: string, keepRaw?: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(keepRaw ? { NOT: { tokenHash: sha256(keepRaw) } } : {}),
      },
      data: { revokedAt: new Date() },
    });
  }
}
