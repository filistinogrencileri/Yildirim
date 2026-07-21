/** Well-known keys for admin-configurable lists (rows in the `lists` table). */
export const LIST_KEYS = {
  REFERRAL_SOURCE: 'referral_source',
  COUNTRIES: 'countries',
  DEGREE_LEVELS: 'degree_levels',
  GENDERS: 'genders',
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

export const REQUEST_REFERENCE_PREFIX = 'YLD';
