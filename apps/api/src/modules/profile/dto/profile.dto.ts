import { Type } from 'class-transformer';
import {
  Allow,
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class ValueInputDto {
  @IsUUID()
  fieldId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  entryIndex?: number;

  @Allow()
  value?: unknown;

  @IsOptional()
  @IsUUID()
  fileId?: string | null;
}

export class SaveValuesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ValueInputDto)
  values!: ValueInputDto[];
}

export class UploadDocumentDto {
  @IsUUID()
  fieldId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  entryIndex?: number;
}
