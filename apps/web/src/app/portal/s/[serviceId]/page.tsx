'use client';

import { use, useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, CaretLeft, PencilSimple } from '@phosphor-icons/react';
import { localize, REQUEST_STATUSES, type RequestStatus } from '@yildirim/shared';
import { useAuth } from '@/lib/auth';
import { useServiceQueue, useStaffServices } from '@/lib/staff';
import { StatusChip, STATUS_LABELS } from '@/components/requests/status-chip';

const card = 'rounded-2xl border border-bone-200 bg-white shadow-[0_8px_32px_-24px_rgba(31,42,92,0.25)]';

// review-first ordering for the grouped sections
const GROUP_ORDER: RequestStatus[] = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'NEEDS_ACTION',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
];

/** All applicants of one service, grouped by request status. */
export default function ServiceApplicantsPage({ params }: { params: Promise<{ serviceId: string }> }) {
  const { serviceId } = use(params);
  const { user } = useAuth();
  const { data: services } = useStaffServices();
  const { data: queue, isLoading } = useServiceQueue(serviceId);
  const service = services?.find((s) => s.id === serviceId);

  const groups = useMemo(() => {
    const map = new Map<RequestStatus, NonNullable<typeof queue>>();
    for (const status of GROUP_ORDER) map.set(status, []);
    for (const r of queue ?? []) map.get(r.status)?.push(r);
    return [...map.entries()].filter(([, items]) => items.length > 0);
  }, [queue]);

  if (isLoading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <span className="size-8 animate-spin rounded-full border-2 border-saffron-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <Link href="/portal" className="inline-flex items-center gap-2 text-sm text-ink-500 hover:text-ink-900">
        <ArrowRight size={16} />
        كل الخدمات
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink-900">
            {service ? localize(service.title) : 'الطلبات'}
          </h1>
          <p className="mt-1 text-sm text-ink-500">{queue?.length ?? 0} طلب</p>
        </div>
        {user?.role === 'ADMIN' && (
          <Link
            href={`/portal/services/${serviceId}/edit`}
            className="inline-flex items-center gap-2 rounded-xl border border-ink-900/15 bg-white px-4 py-2 text-sm font-medium text-ink-900 transition-colors hover:border-saffron-600/60 hover:text-saffron-700"
          >
            <PencilSimple size={16} />
            تحرير الخدمة
          </Link>
        )}
      </div>

      {groups.length === 0 ? (
        <div className={`mt-8 ${card} p-12 text-center text-ink-500`}>لا توجد طلبات على هذه الخدمة بعد.</div>
      ) : (
        <div className="mt-8 space-y-8">
          {groups.map(([status, items]) => (
            <section key={status}>
              <div className="mb-3 flex items-center gap-3">
                <StatusChip status={status} size="sm" />
                <span className="text-xs text-ink-300">{items.length}</span>
                <span className="h-px flex-1 bg-bone-200" />
              </div>
              <div className="space-y-2">
                {items.map((r) => (
                  <Link
                    key={r.id}
                    href={`/portal/requests/${r.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-bone-200 bg-white px-5 py-3.5 shadow-[0_4px_16px_-14px_rgba(31,42,92,0.3)] transition-all hover:-translate-y-0.5 hover:border-saffron-400/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink-900">{r.student.fullNameAr}</p>
                      <p dir="ltr" className="mt-0.5 text-end text-xs text-ink-300">{r.referenceNo}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {r.submittedAt && (
                        <span className="text-xs text-ink-300">
                          {new Date(r.submittedAt).toLocaleDateString('ar', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                      <CaretLeft size={15} className="text-ink-300" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
