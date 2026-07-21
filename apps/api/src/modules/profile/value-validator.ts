import { BadRequestException } from '@nestjs/common';
import type { FieldDefinition, ListItem } from '@prisma/client';

const E164 = /^\+[1-9]\d{7,14}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

interface Validation {
  min?: number;
  max?: number;
  maxLength?: number;
  regex?: string;
  maxSizeMb?: number;
}

/**
 * Validates a submitted value against its field definition. Field types with
 * files (FILE_PDF / FILE_IMAGE) are linked via fileId and validated at upload
 * time — a non-null `value` on them is rejected here.
 */
export function validateFieldValue(
  field: FieldDefinition & { list: { items: ListItem[] } | null },
  value: unknown,
): unknown {
  if (value === null || value === undefined || value === '') return null;
  const rules = (field.validation ?? {}) as Validation;

  switch (field.type) {
    case 'TEXT':
    case 'TEXTAREA': {
      if (typeof value !== 'string') throw bad(field, 'EXPECTED_TEXT');
      const max = rules.maxLength ?? (field.type === 'TEXT' ? 300 : 5000);
      if (value.length > max) throw bad(field, 'TEXT_TOO_LONG');
      if (rules.regex && !new RegExp(rules.regex).test(value)) throw bad(field, 'REGEX_MISMATCH');
      return value.trim();
    }
    case 'NUMBER': {
      const n = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(n)) throw bad(field, 'EXPECTED_NUMBER');
      if (rules.min !== undefined && n < rules.min) throw bad(field, 'NUMBER_TOO_SMALL');
      if (rules.max !== undefined && n > rules.max) throw bad(field, 'NUMBER_TOO_LARGE');
      return n;
    }
    case 'DATE': {
      if (typeof value !== 'string' || !ISO_DATE.test(value) || isNaN(Date.parse(value))) {
        throw bad(field, 'EXPECTED_DATE');
      }
      return value;
    }
    case 'BOOLEAN': {
      if (typeof value !== 'boolean') throw bad(field, 'EXPECTED_BOOLEAN');
      return value;
    }
    case 'PHONE': {
      if (typeof value !== 'string' || !E164.test(value)) throw bad(field, 'EXPECTED_PHONE_E164');
      return value;
    }
    case 'EMAIL': {
      if (typeof value !== 'string' || !EMAIL.test(value)) throw bad(field, 'EXPECTED_EMAIL');
      return value.toLowerCase();
    }
    case 'SELECT': {
      if (typeof value !== 'string') throw bad(field, 'EXPECTED_OPTION');
      assertOption(field, value);
      return value;
    }
    case 'MULTI_SELECT': {
      if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
        throw bad(field, 'EXPECTED_OPTIONS');
      }
      for (const v of value as string[]) assertOption(field, v);
      return value;
    }
    case 'FILE_PDF':
    case 'FILE_IMAGE':
      throw bad(field, 'FILE_FIELDS_TAKE_UPLOADS');
    default:
      throw bad(field, 'UNSUPPORTED_TYPE');
  }
}

function assertOption(
  field: FieldDefinition & { list: { items: ListItem[] } | null },
  value: string,
): void {
  const ok = field.list?.items.some((i) => i.value === value && i.isActive);
  if (!ok) throw bad(field, 'OPTION_NOT_IN_LIST');
}

function bad(field: FieldDefinition, code: string): BadRequestException {
  return new BadRequestException(`${code}:${field.key}`);
}
