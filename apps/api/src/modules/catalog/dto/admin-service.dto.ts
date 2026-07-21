import { Type } from 'class-transformer';
import {
  Allow,
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { CHOICE_MODES, SERVICE_TYPES } from '@yildirim/shared';

export class UpsertServiceDto {
  @IsString()
  @Matches(/^[a-z0-9-]{3,60}$/, { message: 'BAD_SLUG' })
  slug!: string;

  @Allow()
  title!: unknown; // {ar, en?} — validated shape-wise in service

  @Allow()
  description!: unknown;

  @IsIn(SERVICE_TYPES as readonly string[])
  type!: (typeof SERVICE_TYPES)[number];

  @IsIn(CHOICE_MODES as readonly string[])
  choiceMode!: (typeof CHOICE_MODES)[number];

  @IsInt()
  @Min(1)
  @Max(10)
  maxChoices!: number;

  @IsOptional()
  @IsISO8601()
  deadlineAt?: string;
}

export class SetRequirementsDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => RequirementItemDto)
  requirements!: RequirementItemDto[];
}

export class RequirementItemDto {
  @IsUUID()
  fieldId!: string;

  @IsBoolean()
  isRequired!: boolean;
}

export class AssignSupervisorDto {
  @IsUUID()
  userId!: string;
}

export class SetPublishedDto {
  @IsBoolean()
  isPublished!: boolean;
}
