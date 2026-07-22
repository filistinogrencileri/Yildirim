'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ChoiceMode, LocalizedText, RequestOutcome, RequestStatus, ServiceType } from '@yildirim/shared';
import { api } from './auth';

export interface ServiceSummary {
  id: string;
  slug: string;
  title: LocalizedText;
  description: LocalizedText;
  type: ServiceType;
  choiceMode: ChoiceMode;
  maxChoices: number;
  deadlineAt: string | null;
}

export interface ServiceDetail extends ServiceSummary {
  requirements: Array<{
    fieldId: string;
    isRequired: boolean;
    label: LocalizedText;
    sectionKey: string;
    sectionTitle: LocalizedText;
  }>;
  universities: Array<{ id: string; name: LocalizedText; city: string | null }>;
  majors: Array<{ id: string; name: LocalizedText }>;
}

export interface Eligibility {
  eligible: boolean;
  photoMissing: boolean;
  missing: Array<{ fieldId: string; fieldKey: string; label: LocalizedText; sectionKey: string; sectionTitle: LocalizedText }>;
  existingRequest: { id: string; status: RequestStatus; referenceNo: string } | null;
}

export interface RequestChoiceView {
  id: string;
  rank: number;
  university: { id: string; name: LocalizedText; city: string | null };
  major: { id: string; name: LocalizedText };
}

export interface StudentRequest {
  id: string;
  referenceNo: string;
  service: { id: string; slug: string; title: LocalizedText; type: ServiceType; choiceMode: ChoiceMode };
  status: RequestStatus;
  outcome: RequestOutcome | null;
  submittedAt: string | null;
  decidedAt: string | null;
  choices: RequestChoiceView[];
  acceptedChoiceId: string | null;
  acceptanceLetterUrl: string | null;
  history: Array<{ toStatus: RequestStatus; note: string | null; at: string }>;
  createdAt: string;
}

export function useServices() {
  return useQuery({
    queryKey: ['catalog', 'services'],
    queryFn: () => api<ServiceSummary[]>('/catalog/services'),
  });
}

export function useService(slug: string) {
  return useQuery({
    queryKey: ['catalog', 'service', slug],
    queryFn: () => api<ServiceDetail>(`/catalog/services/${slug}`),
  });
}

export interface MyService extends ServiceSummary {
  eligible: boolean;
  photoMissing: boolean;
  missing: Array<{ fieldId: string; label: LocalizedText; sectionKey: string; sectionTitle: LocalizedText }>;
  existingRequest: { id: string; status: RequestStatus; referenceNo: string } | null;
}

export function useMyServices(enabled = true) {
  return useQuery({
    queryKey: ['catalog', 'my-services'],
    queryFn: () => api<MyService[]>('/catalog/my-services'),
    enabled,
  });
}

export function useEligibility(slug: string, enabled: boolean) {
  return useQuery({
    queryKey: ['catalog', 'eligibility', slug],
    queryFn: () => api<Eligibility>(`/catalog/services/${slug}/eligibility`),
    enabled,
  });
}

export function useApply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { serviceSlug: string; choices: Array<{ universityId: string; majorId: string }> }) =>
      api<StudentRequest>('/requests', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['requests'] });
      void qc.invalidateQueries({ queryKey: ['catalog', 'eligibility'] });
    },
  });
}

export function useMyRequests() {
  return useQuery({
    queryKey: ['requests', 'mine'],
    queryFn: () => api<StudentRequest[]>('/requests/mine'),
  });
}

export function useMyRequest(id: string) {
  return useQuery({
    queryKey: ['requests', 'one', id],
    queryFn: () => api<StudentRequest>(`/requests/${id}`),
  });
}

export function useResubmit(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<StudentRequest>(`/requests/${id}/resubmit`, { method: 'POST' }),
    onSuccess: (data) => qc.setQueryData(['requests', 'one', id], data),
  });
}

export function useCancelRequest(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<StudentRequest>(`/requests/${id}/cancel`, { method: 'POST' }),
    onSuccess: (data) => qc.setQueryData(['requests', 'one', id], data),
  });
}
