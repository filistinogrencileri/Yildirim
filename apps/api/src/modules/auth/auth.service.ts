import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { APP_SETTING_KEYS, LIST_KEYS } from '@yildirim/shared';
import type { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { TokenService } from './token.service';
import { VerificationService } from './verification.service';
import type { LoginDto, RegisterDto } from './dto/auth.dto';

export interface AuthResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

export interface PublicUser {
  id: string;
  email: string;
  fullNameAr: string;
  fullNameEn: string;
  phone: string;
  role: User['role'];
  emailVerified: boolean;
  locale: string;
}

export function toPublicUser(u: User): PublicUser {
  return {
    id: u.id,
    email: u.email,
    fullNameAr: u.fullNameAr,
    fullNameEn: u.fullNameEn,
    phone: u.phoneE164,
    role: u.role,
    emailVerified: u.emailVerifiedAt !== null,
    locale: u.locale,
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly verification: VerificationService,
    private readonly mail: MailService,
  ) {}

  private async isEmailVerificationEnforced(): Promise<boolean> {
    const setting = await this.prisma.appSetting.findUnique({
      where: { key: APP_SETTING_KEYS.EMAIL_VERIFICATION_ENFORCED },
    });
    return setting?.value === true;
  }

  async register(dto: RegisterDto, meta: { userAgent?: string; ip?: string }): Promise<AuthResult> {
    if (dto.password !== dto.passwordConfirm) {
      throw new BadRequestException('PASSWORD_CONFIRM_MISMATCH');
    }

    if (dto.referralSourceItemId) {
      const item = await this.prisma.listItem.findFirst({
        where: { id: dto.referralSourceItemId, isActive: true, list: { key: LIST_KEYS.REFERRAL_SOURCE } },
      });
      if (!item) throw new BadRequestException('INVALID_REFERRAL_SOURCE');
    }

    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('EMAIL_TAKEN');

    const user = await this.prisma.user.create({
      data: {
        email,
        phoneE164: dto.phone,
        passwordHash: await argon2.hash(dto.password, { type: argon2.argon2id }),
        fullNameAr: dto.fullNameAr.trim(),
        fullNameEn: dto.fullNameEn.trim(),
        referralSourceItemId: dto.referralSourceItemId,
        role: 'STUDENT',
      },
    });

    // Verification flow always runs (code created + mailed); only *enforcement*
    // at login is behind the feature flag (plan module 1).
    const code = await this.verification.createEmailCode(user.id);
    await this.mail.send({
      to: user.email,
      subject: 'رمز التحقق — يلدرم',
      text: `رمز التحقق الخاص بك هو: ${code} (صالح لمدة ١٥ دقيقة)`,
    });

    const accessToken = this.tokens.signAccessToken(user);
    const refreshToken = await this.tokens.issueRefreshToken(user.id, meta);
    return { user: toPublicUser(user), accessToken, refreshToken };
  }

  async login(dto: LoginDto, meta: { userAgent?: string; ip?: string }): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });
    // hash check even for unknown emails keeps timing uniform
    const hash = user?.passwordHash ?? (await argon2.hash('timing-equalizer'));
    const valid = await argon2.verify(hash, dto.password).catch(() => false);
    if (!user || !valid) throw new UnauthorizedException('INVALID_CREDENTIALS');
    if (user.status !== 'ACTIVE') throw new ForbiddenException('ACCOUNT_SUSPENDED');

    if (!user.emailVerifiedAt && (await this.isEmailVerificationEnforced())) {
      throw new ForbiddenException('EMAIL_NOT_VERIFIED');
    }

    const accessToken = this.tokens.signAccessToken(user);
    const refreshToken = await this.tokens.issueRefreshToken(user.id, meta);
    return { user: toPublicUser(user), accessToken, refreshToken };
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return toPublicUser(user);
  }

  async resendVerification(userId: string): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.emailVerifiedAt) throw new BadRequestException('ALREADY_VERIFIED');
    const code = await this.verification.createEmailCode(user.id);
    await this.mail.send({
      to: user.email,
      subject: 'رمز التحقق — يلدرم',
      text: `رمز التحقق الخاص بك هو: ${code} (صالح لمدة ١٥ دقيقة)`,
    });
  }

  async forgotPassword(email: string): Promise<void> {
    const result = await this.verification.createResetToken(email);
    if (result) {
      // dev stub logs the link; production template comes with Resend
      await this.mail.send({
        to: email.toLowerCase(),
        subject: 'استعادة كلمة المرور — يلدرم',
        text: `رابط استعادة كلمة المرور: /reset-password?token=${result.token} (صالح لمدة ٣٠ دقيقة)`,
      });
    }
  }

  async resetPassword(rawToken: string, password: string, passwordConfirm: string): Promise<void> {
    if (password !== passwordConfirm) throw new BadRequestException('PASSWORD_CONFIRM_MISMATCH');
    const userId = await this.verification.consumeResetToken(rawToken);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await argon2.hash(password, { type: argon2.argon2id }) },
    });
  }

  /** Authenticated password change (settings pages — all roles). */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    newPasswordConfirm: string,
  ): Promise<void> {
    if (newPassword !== newPasswordConfirm) throw new BadRequestException('PASSWORD_CONFIRM_MISMATCH');
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const ok = await argon2.verify(user.passwordHash, currentPassword).catch(() => false);
    if (!ok) throw new BadRequestException('CURRENT_PASSWORD_WRONG');
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await argon2.hash(newPassword, { type: argon2.argon2id }) },
    });
  }
}
