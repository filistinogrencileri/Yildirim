import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const PHONE_E164 = /^\+[1-9]\d{7,14}$/;

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullNameAr!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(/^[A-Za-z\s.'-]+$/, { message: 'FULL_NAME_EN_LATIN_ONLY' })
  fullNameEn!: string;

  @IsEmail({}, { message: 'INVALID_EMAIL' })
  email!: string;

  @Matches(PHONE_E164, { message: 'INVALID_PHONE_E164' })
  phone!: string;

  @IsString()
  @MinLength(8, { message: 'PASSWORD_TOO_SHORT' })
  @MaxLength(72)
  password!: string;

  @IsString()
  passwordConfirm!: string;

  @IsOptional()
  @IsUUID()
  referralSourceItemId?: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @MinLength(8, { message: 'PASSWORD_TOO_SHORT' })
  @MaxLength(72)
  password!: string;

  @IsString()
  passwordConfirm!: string;
}

export class VerifyEmailDto {
  @Length(6, 6)
  code!: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @IsString()
  @MinLength(8, { message: 'PASSWORD_TOO_SHORT' })
  @MaxLength(72)
  newPassword!: string;

  @IsString()
  newPasswordConfirm!: string;
}
