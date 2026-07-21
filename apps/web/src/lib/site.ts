'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SiteContact, SiteCopyright, SiteSocial, LegalType } from '@yildirim/shared';
import { api } from './auth';

export const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

export interface SiteConfig {
  contact: SiteContact;
  social: SiteSocial;
  newsletterEnabled: boolean;
  copyright: SiteCopyright;
  legal: Record<LegalType, { title: string; hasPdf: boolean }>;
}

export interface LegalContent {
  title: string;
  body: string;
  hasPdf: boolean;
}

export function legalPdfHref(type: LegalType): string {
  return `${API_ORIGIN}/site/legal/${type}/document.pdf`;
}

export function useSiteConfig() {
  return useQuery({
    queryKey: ['site', 'config'],
    queryFn: () => api<SiteConfig>('/site/config'),
    staleTime: 5 * 60_000,
  });
}

export function useLegal(type: LegalType, enabled: boolean) {
  return useQuery({
    queryKey: ['site', 'legal', type],
    queryFn: () => api<LegalContent>(`/site/legal/${type}`),
    enabled,
  });
}

export function useSubscribe() {
  return useMutation({
    mutationFn: (email: string) =>
      api('/site/newsletter', { method: 'POST', body: JSON.stringify({ email }) }),
  });
}

// ── admin ───────────────────────────────────────────────────────────────────

export interface AdminSiteSettings {
  contact: SiteContact;
  social: SiteSocial;
  newsletterEnabled: boolean;
  copyright: SiteCopyright;
  legal: Record<LegalType, { title: string; body: string; hasPdf: boolean }>;
}

export function useAdminSiteSettings() {
  return useQuery({
    queryKey: ['admin', 'site', 'settings'],
    queryFn: () => api<AdminSiteSettings>('/admin/site/settings'),
  });
}

export function useSaveSiteSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      contact: SiteContact;
      social: SiteSocial;
      newsletterEnabled: boolean;
      copyright: SiteCopyright;
    }) => api('/admin/site/settings', { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'site'] });
      void qc.invalidateQueries({ queryKey: ['site'] });
    },
  });
}

export function useSaveLegal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ type, title, body }: { type: LegalType; title: string; body: string }) =>
      api(`/admin/site/legal/${type}`, { method: 'PUT', body: JSON.stringify({ title, body }) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'site'] });
      void qc.invalidateQueries({ queryKey: ['site'] });
    },
  });
}

export function useUploadLegalPdf() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ type, file }: { type: LegalType; file: File }) => {
      const form = new FormData();
      form.append('file', file);
      return api(`/admin/site/legal/${type}/pdf`, { method: 'POST', body: form });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'site'] });
      void qc.invalidateQueries({ queryKey: ['site'] });
    },
  });
}

export function useRemoveLegalPdf() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (type: LegalType) => api(`/admin/site/legal/${type}/pdf`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'site'] });
      void qc.invalidateQueries({ queryKey: ['site'] });
    },
  });
}
