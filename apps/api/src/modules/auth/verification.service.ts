import { createHash, randomBytes, randomInt } from 'crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService } from './token.service';

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');
const CODE_TTL_MS = 15 * 60 * 1000;
const RESET_TTL_MS = 30 * 60 * 1000;
const MAX_ATTEMPTS = 5;

@Injectable()
export class VerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
  ) {}

  /** Creates a fresh 6-digit email code, invalidating previous ones. */
  async createEmailCode(userId: string): Promise<string> {
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    await this.prisma.emailVerificationCode.updateMany({
      where: { userId, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    await this.prisma.emailVerificationCode.create({
      data: {
        userId,
        codeHash: sha256(code),
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
      },
    });
    return code;
  }

  async verifyEmailCode(userId: string, code: string): Promise<void> {
    const rec = await this.prisma.emailVerificationCode.findFirst({
      where: { userId, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!rec || rec.expiresAt < new Date()) throw new BadRequestException('CODE_EXPIRED');
    if (rec.attempts >= MAX_ATTEMPTS) throw new BadRequestException('TOO_MANY_ATTEMPTS');

    if (rec.codeHash !== sha256(code)) {
      await this.prisma.emailVerificationCode.update({
        where: { id: rec.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('INVALID_CODE');
    }

    await this.prisma.$transaction([
      this.prisma.emailVerificationCode.update({
        where: { id: rec.id },
        data: { consumedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { emailVerifiedAt: new Date() },
      }),
    ]);
  }

  /** Returns the raw reset token, or null when the email is unknown (kept silent). */
  async createResetToken(email: string): Promise<{ token: string; userId: string } | null> {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return null;
    const token = randomBytes(32).toString('hex');
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + RESET_TTL_MS),
      },
    });
    return { token, userId: user.id };
  }

  async consumeResetToken(rawToken: string): Promise<string> {
    const rec = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: sha256(rawToken) },
    });
    if (!rec || rec.consumedAt || rec.expiresAt < new Date()) {
      throw new BadRequestException('INVALID_RESET_TOKEN');
    }
    await this.prisma.passwordResetToken.update({
      where: { id: rec.id },
      data: { consumedAt: new Date() },
    });
    // any leaked sessions die with the old password
    await this.tokens.revokeAllForUser(rec.userId);
    return rec.userId;
  }
}
