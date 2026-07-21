import { z } from 'zod';

/**
 * Admin-authored strings are stored as localized objects (plan §3).
 * Arabic is required at launch; other locales are optional additions.
 */
export const localizedTextSchema = z.object({
  ar: z.string().min(1),
  en: z.string().optional(),
  tr: z.string().optional(),
});
export type LocalizedText = z.infer<typeof localizedTextSchema>;

export const SUPPORTED_LOCALES = ['ar', 'en', 'tr'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'ar';

export function localize(text: LocalizedText, locale: Locale = DEFAULT_LOCALE): string {
  return text[locale] ?? text.ar;
}
