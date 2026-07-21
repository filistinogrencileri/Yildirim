// Admin-managed site-wide settings (stored in app_settings under `site_settings`),
// plus legal documents (`legal_privacy`, `legal_terms`).

export interface SiteContact {
  phone: string;
  email: string;
  whatsapp: string;
  address: string;
}

export interface SiteSocial {
  facebook: string;
  instagram: string;
  tiktok: string;
  youtube: string;
  twitter: string;
  telegram: string;
}

export interface SiteCopyright {
  text: string;
  url: string;
}

export interface SiteSettings {
  contact: SiteContact;
  social: SiteSocial;
  newsletterEnabled: boolean;
  copyright: SiteCopyright;
}

export interface LegalDocument {
  title: string;
  body: string;
  pdfFileId: string | null;
}

export type LegalType = 'privacy' | 'terms';
export const LEGAL_TYPES: readonly LegalType[] = ['privacy', 'terms'];

export const SITE_SETTINGS_KEY = 'site_settings';
export const LEGAL_KEY: Record<LegalType, string> = {
  privacy: 'legal_privacy',
  terms: 'legal_terms',
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  contact: { phone: '', email: '', whatsapp: '', address: '' },
  social: { facebook: '', instagram: '', tiktok: '', youtube: '', twitter: '', telegram: '' },
  newsletterEnabled: true,
  copyright: {
    text: 'جميع الحقوق محفوظة © يلدريم للخدمات التعليمية',
    url: '',
  },
};
