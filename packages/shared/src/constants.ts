/** Well-known keys for admin-configurable lists (rows in the `lists` table). */
export const LIST_KEYS = {
  REFERRAL_SOURCE: 'referral_source',
  COUNTRIES: 'countries',
  DEGREE_LEVELS: 'degree_levels',
  GENDERS: 'genders',
  MARITAL_STATUS: 'marital_status',
  PASSPORT_TYPES: 'passport_types',
  IMMIGRATION_OFFICES: 'immigration_offices',
  UNIVERSITY_TYPES: 'university_types',
  RESIDENCE_REGISTRATION_TYPES: 'residence_registration_types',
} as const;

/** Well-known profile section keys seeded at install; admins can add more. */
export const SECTION_KEYS = {
  PERSONAL_INFO: 'personal_info',
  ACADEMIC_INFO: 'academic_info',
  WORK_EXPERIENCE: 'work_experience',
  DOCUMENTS: 'documents',
} as const;

export const APP_SETTING_KEYS = {
  EMAIL_VERIFICATION_ENFORCED: 'email_verification_enforced',
} as const;

/**
 * Structured-outcome kinds a service can declare via `Service.config.outcomeKind`.
 * APPOINTMENT: completing with ACCEPTED requires outcomeData
 * {office, appointmentAt, note?} (e.g. residence-permit appointment booking).
 */
export const OUTCOME_KINDS = ['APPOINTMENT'] as const;
export type OutcomeKind = (typeof OUTCOME_KINDS)[number];

export interface AppointmentOutcome {
  office: string;
  appointmentAt: string; // ISO datetime
  note?: string;
}

export const REQUEST_REFERENCE_PREFIX = 'YLD';
