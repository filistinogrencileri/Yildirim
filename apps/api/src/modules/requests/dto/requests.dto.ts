import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
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
}
