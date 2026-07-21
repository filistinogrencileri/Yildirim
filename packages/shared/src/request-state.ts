import type { RequestStatus, UserRole } from './enums';

/**
 * Single source of truth for the request state machine (plan §4).
 * The API enforces it; the web reads it to render available actions.
 */
export const REQUEST_TRANSITIONS: Record<RequestStatus, readonly RequestStatus[]> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['UNDER_REVIEW', 'CANCELLED'],
  UNDER_REVIEW: ['NEEDS_ACTION', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  NEEDS_ACTION: ['UNDER_REVIEW', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'NEEDS_ACTION', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

/** Which roles may perform a given transition (admin always may). */
export function rolesAllowedFor(from: RequestStatus, to: RequestStatus): readonly UserRole[] {
  if (from === 'DRAFT' && to === 'SUBMITTED') return ['STUDENT'];
  if (from === 'NEEDS_ACTION' && to === 'UNDER_REVIEW') return ['STUDENT'];
  // Students may cancel only before review starts.
  if (to === 'CANCELLED' && (from === 'DRAFT' || from === 'SUBMITTED'))
    return ['STUDENT', 'SUPERVISOR', 'ADMIN'];
  if (to === 'CANCELLED') return ['ADMIN'];
  return ['SUPERVISOR', 'ADMIN'];
}

export function canTransition(from: RequestStatus, to: RequestStatus, role: UserRole): boolean {
  return REQUEST_TRANSITIONS[from].includes(to) && rolesAllowedFor(from, to).includes(role);
}

export const TERMINAL_STATUSES: readonly RequestStatus[] = ['COMPLETED', 'CANCELLED'];
