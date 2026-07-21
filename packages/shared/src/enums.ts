export const USER_ROLES = ['STUDENT', 'SUPERVISOR', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ['ACTIVE', 'SUSPENDED'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const REQUEST_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'NEEDS_ACTION',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const REQUEST_OUTCOMES = ['ACCEPTED', 'REJECTED'] as const;
export type RequestOutcome = (typeof REQUEST_OUTCOMES)[number];

export const FIELD_TYPES = [
  'TEXT',
  'TEXTAREA',
  'NUMBER',
  'DATE',
  'SELECT',
  'MULTI_SELECT',
  'PHONE',
  'EMAIL',
  'BOOLEAN',
  'FILE_PDF',
  'FILE_IMAGE',
] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export const SERVICE_TYPES = ['UNIVERSITY_PLACEMENT', 'GENERAL'] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];

export const CHOICE_MODES = ['SINGLE', 'MULTI'] as const;
export type ChoiceMode = (typeof CHOICE_MODES)[number];

export const FILE_KINDS = [
  'PROFILE_PHOTO',
  'DOCUMENT',
  'ACCEPTANCE_LETTER',
  'ANNOUNCEMENT_IMAGE',
  'EXPORT',
] as const;
export type FileKind = (typeof FILE_KINDS)[number];
