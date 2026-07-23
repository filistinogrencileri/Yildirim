'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FieldType, LocalizedText } from '@yildirim/shared';
import { api } from './auth';

export interface ProfileFieldDef {
  id: string;
  key: string;
  label: LocalizedText;
  helpText: LocalizedText | null;
  type: FieldType;
  isRequired: boolean;
  validation: {
    min?: number;
    max?: number;
    maxLength?: number;
    maxSizeMb?: number;
    /** conditional display: render only when entry[field] === equals */
    showIf?: { field: string; equals: unknown };
  } | null;
  options: Array<{ value: string; label: LocalizedText }> | null;
}

export interface ProfileEntryValue {
  value: unknown;
  fileId: string | null;
  fileName?: string;
  fileUrl?: string;
}

export interface ProfileSectionData {
  id: string;
  key: string;
  title: LocalizedText;
  isRepeatable: boolean;
  state: 'COMPLETE' | 'INCOMPLETE' | 'NOT_REQUIRED';
  fields: ProfileFieldDef[];
  entries: Array<{ entryIndex: number; values: Record<string, ProfileEntryValue> }>;
}

export interface ProfileData {
  photo: { fileId: string; url: string } | null;
  sections: ProfileSectionData[];
  completeness: {
    percent: number;
    requiredTotal: number;
    requiredFilled: number;
    missing: Array<{ sectionKey: string; fieldKey: string; label: LocalizedText }>;
  };
}

const PROFILE_KEY = ['profile', 'me'];

export function useProfile() {
  return useQuery({
    queryKey: PROFILE_KEY,
    queryFn: () => api<ProfileData>('/profile/me'),
  });
}

export interface ValueInput {
  fieldId: string;
  entryIndex?: number;
  value?: unknown;
  fileId?: string | null;
}

export function useSaveValues() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: ValueInput[]) =>
      api<ProfileData>('/profile/values', { method: 'PUT', body: JSON.stringify({ values }) }),
    onSuccess: (data) => qc.setQueryData(PROFILE_KEY, data),
  });
}

export function useDeleteEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sectionId, entryIndex }: { sectionId: string; entryIndex: number }) =>
      api<ProfileData>(`/profile/entries/${sectionId}/${entryIndex}`, { method: 'DELETE' }),
    onSuccess: (data) => qc.setQueryData(PROFILE_KEY, data),
  });
}

export function useUploadPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return api<{ fileId: string; url: string }>('/profile/photo', { method: 'POST', body: form });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: PROFILE_KEY }),
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fieldId, entryIndex, file }: { fieldId: string; entryIndex?: number; file: File }) => {
      const form = new FormData();
      form.append('fieldId', fieldId);
      if (entryIndex !== undefined) form.append('entryIndex', String(entryIndex));
      form.append('file', file);
      return api<{ fileId: string; fileName: string; fileUrl: string }>('/profile/documents', {
        method: 'POST',
        body: form,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: PROFILE_KEY }),
  });
}

export const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

/** File URLs from the API are relative (e.g. /files/id?t=...) — prefix them. */
export function fileHref(url: string): string {
  return `${API_ORIGIN}${url}`;
}
