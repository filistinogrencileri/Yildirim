'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ChoiceMode, LocalizedText, RequestOutcome, RequestStatus, ServiceType } from '@yildirim/shared';
import { api } from './auth';
import type { RequestChoiceView } from './catalog';

export interface QueueItem {
  id: string;
  referenceNo: string;
  status: RequestStatus;
  submittedAt: string | null;
  service: { id: string; slug: string; title: LocalizedText; type: ServiceType };
  student: { id: string; fullNameAr: string; email: string; phoneE164: string };
}

export interface StaffRequestDetail {
  id: string;
  referenceNo: string;
  service: { id: string; slug: string; title: LocalizedText; type: ServiceType; choiceMode: ChoiceMode };
  status: RequestStatus;
  outcome: RequestOutcome | null;
  submittedAt: string | null;
  decidedAt: string | null;
  student: {
    id: string;
    fullNameAr: string;
    fullNameEn: string;
    email: string;
    phoneE164: string;
    photoUrl: string | null;
    whatsapp: string;
  };
  choices: RequestChoiceView[];
  acceptedChoiceId: string | null;
  acceptanceLetterUrl: string | null;
  answers: Array<{
    fieldKey: string;
    label: LocalizedText;
    type: string;
    value: unknown;
    fileId: string | null;
    fileName: string | null;
    fileUrl: string | null;
  }>;
  history: Array<{ fromStatus: RequestStatus | null; toStatus: RequestStatus; note: string | null; createdAt: string }>;
}

export function useStaffQueue(filter: { status?: RequestStatus }) {
  const params = new URLSearchParams();
  if (filter.status) params.set('status', filter.status);
  const qs = params.toString();
  return useQuery({
    queryKey: ['staff', 'queue', filter.status ?? 'all'],
    queryFn: () => api<QueueItem[]>(`/staff/requests${qs ? `?${qs}` : ''}`),
  });
}

export function useStaffRequest(id: string) {
  return useQuery({
    queryKey: ['staff', 'request', id],
    queryFn: () => api<StaffRequestDetail>(`/staff/requests/${id}`),
  });
}

export function useTransition(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      to: RequestStatus;
      note?: string;
      outcome?: RequestOutcome;
      acceptedChoiceId?: string;
    }) => api(`/staff/requests/${id}/transition`, { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['staff'] });
    },
  });
}

export function useUploadLetter(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return api<{ fileId: string; fileName: string }>(`/staff/requests/${id}/acceptance-letter`, {
        method: 'POST',
        body: form,
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['staff', 'request', id] });
    },
  });
}

// ── admin: services ──────────────────────────────────────────────────────────

export interface AdminService {
  id: string;
  slug: string;
  title: LocalizedText;
  description: LocalizedText;
  type: ServiceType;
  choiceMode: ChoiceMode;
  maxChoices: number;
  isPublished: boolean;
  publishedAt: string | null;
  deadlineAt: string | null;
  supervisors: Array<{ user: { id: string; fullNameAr: string; email: string } }>;
  requirements: Array<{ fieldId: string; isRequired: boolean }>;
  _count: { requests: number; requirements: number };
}

export function useAdminServices() {
  return useQuery({
    queryKey: ['admin', 'services'],
    queryFn: () => api<AdminService[]>('/admin/services'),
  });
}

export function useSetPublished() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) =>
      api(`/admin/services/${id}/published`, { method: 'PUT', body: JSON.stringify({ isPublished }) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'services'] }),
  });
}

export function useAvailableSupervisors() {
  return useQuery({
    queryKey: ['admin', 'supervisors'],
    queryFn: () => api<Array<{ id: string; fullNameAr: string; email: string }>>('/admin/services/supervisors/available'),
  });
}

export function useAssignSupervisor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ serviceId, userId }: { serviceId: string; userId: string }) =>
      api(`/admin/services/${serviceId}/supervisors`, { method: 'POST', body: JSON.stringify({ userId }) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'services'] }),
  });
}

export function useRemoveSupervisor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ serviceId, userId }: { serviceId: string; userId: string }) =>
      api(`/admin/services/${serviceId}/supervisors/${userId}`, { method: 'DELETE' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'services'] }),
  });
}

export function useAssignAllSupervisors() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (serviceId: string) =>
      api<{ assigned: number }>(`/admin/services/${serviceId}/supervisors/all`, { method: 'POST' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'services'] }),
  });
}

// ── staff service cards (per-status counts) ─────────────────────────────────

export interface StaffServiceCard {
  id: string;
  slug: string;
  title: LocalizedText;
  type: ServiceType;
  isPublished: boolean;
  requestCounts: Partial<Record<RequestStatus, number>>;
  requestTotal: number;
}

export function useStaffServices() {
  return useQuery({
    queryKey: ['staff', 'services'],
    queryFn: () => api<StaffServiceCard[]>('/staff/services'),
  });
}

export function useServiceQueue(serviceId: string) {
  return useQuery({
    queryKey: ['staff', 'queue', 'service', serviceId],
    queryFn: () => api<QueueItem[]>(`/staff/requests?serviceId=${serviceId}`),
  });
}

// ── admin: service create/edit + requirements + field catalog ───────────────

export interface FieldCatalogSection {
  id: string;
  key: string;
  title: LocalizedText;
  fields: Array<{
    id: string;
    key: string;
    label: LocalizedText;
    type: string;
    isRequiredForProfile: boolean;
  }>;
}

export function useFieldCatalog() {
  return useQuery({
    queryKey: ['admin', 'fields-catalog'],
    queryFn: () => api<FieldCatalogSection[]>('/admin/services/fields/catalog'),
  });
}

export interface ServiceFormInput {
  slug: string;
  title: LocalizedText;
  description: LocalizedText;
  type: ServiceType;
  choiceMode: ChoiceMode;
  maxChoices: number;
  deadlineAt?: string;
}

export function useCreateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ServiceFormInput) =>
      api<{ id: string }>('/admin/services', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'services'] }),
  });
}

export function useUpdateService(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ServiceFormInput) =>
      api(`/admin/services/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin'] }),
  });
}

export function useSetRequirements(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requirements: Array<{ fieldId: string; isRequired: boolean }>) =>
      api(`/admin/services/${id}/requirements`, { method: 'PUT', body: JSON.stringify({ requirements }) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin'] }),
  });
}

// ── supervisors admin ───────────────────────────────────────────────────────

export interface SupervisorRow {
  id: string;
  fullNameAr: string;
  fullNameEn: string;
  email: string;
  phoneE164: string;
  status: string;
  createdAt: string;
  serviceAssignments: Array<{ service: { id: string; title: LocalizedText } }>;
}

export function useSupervisors() {
  return useQuery({
    queryKey: ['admin', 'supervisors', 'list'],
    queryFn: () => api<SupervisorRow[]>('/admin/users/supervisors'),
  });
}

export function useCreateSupervisor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      fullNameAr: string;
      fullNameEn: string;
      email: string;
      phone: string;
      password: string;
    }) => api('/admin/users/supervisors', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'supervisors'] });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string; newPasswordConfirm: string }) =>
      api('/auth/change-password', { method: 'POST', body: JSON.stringify(input) }),
  });
}
