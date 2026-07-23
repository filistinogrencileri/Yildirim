import { Type } from 'class-transformer';
import {
  Allow,
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { REQUEST_OUTCOMES, REQUEST_STATUSES } from '@yildirim/shared';

export class ChoiceDto {
  @IsUUID()
  universityId!: string;

  @IsUUID()
  majorId!: string;
}

export class ApplyDto {
  @IsString()
  serviceSlug!: string;

  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ChoiceDto)
  choices!: ChoiceDto[];

  // service-scoped one-time answers, validated per-field in RequestsService
  @IsOptional()
  @Allow()
  extraAnswers?: Record<string, unknown>;
}

export class OutcomeDataDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  office!: string;

  @IsString()
  @IsNotEmpty()
  appointmentAt!: string; // ISO datetime, checked in the service layer too

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class TransitionDto {
  @IsIn(REQUEST_STATUSES as readonly string[])
  to!: (typeof REQUEST_STATUSES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @IsOptional()
  @IsIn(REQUEST_OUTCOMES as readonly string[])
  outcome?: (typeof REQUEST_OUTCOMES)[number];

  @IsOptional()
  @IsUUID()
  acceptedChoiceId?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => OutcomeDataDto)
  outcomeData?: OutcomeDataDto;
}
