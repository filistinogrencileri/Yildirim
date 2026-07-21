import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

class ContactDto {
  @IsString() @MaxLength(40) phone!: string;
  @IsString() @MaxLength(120) email!: string;
  @IsString() @MaxLength(40) whatsapp!: string;
  @IsString() @MaxLength(300) address!: string;
}

class SocialDto {
  @IsString() @MaxLength(300) facebook!: string;
  @IsString() @MaxLength(300) instagram!: string;
  @IsString() @MaxLength(300) tiktok!: string;
  @IsString() @MaxLength(300) youtube!: string;
  @IsString() @MaxLength(300) twitter!: string;
  @IsString() @MaxLength(300) telegram!: string;
}

class CopyrightDto {
  @IsString() @MaxLength(300) text!: string;
  @IsString() @MaxLength(300) url!: string;
}

export class SaveSiteSettingsDto {
  @IsObject() @ValidateNested() @Type(() => ContactDto) contact!: ContactDto;
  @IsObject() @ValidateNested() @Type(() => SocialDto) social!: SocialDto;
  @IsBoolean() newsletterEnabled!: boolean;
  @IsObject() @ValidateNested() @Type(() => CopyrightDto) copyright!: CopyrightDto;
}

export class SaveLegalDto {
  @IsString() @MaxLength(200) title!: string;
  @IsString() @MaxLength(50000) body!: string;
}

export class SubscribeDto {
  @IsEmail()
  email!: string;

  // honeypot: bots fill hidden fields; humans leave it empty
  @IsOptional()
  @IsString()
  website?: string;
}
