'use client';

import Link from 'next/link';
import { CaretLeft, Plus, Tray } from '@phosphor-icons/react';
import { localize, type RequestStatus } from '@yildirim/shared';
import { useAuth } from '@/lib/auth';
import { useStaffServices } from '@/lib/staff';
import { STATUS_LABELS } from '@/components/requests/status-chip';

const card = 'rounded-2xl border border-bone-200 bg-white shadow-[0_8px_32px_-24px_rgba(31,42,92,0.25)]';

const COUNT_STYLES: Partial<Record<RequestStatus, string>> = {
  SUBMITTED: 'bg-ink-900/5 text-ink-700',
  UNDER_REVIEW: 'bg-saffron-50 text-saffron-700',
  NEEDS_ACTION: 'bg-error-50 text-error-700',
  IN_PROGRESS: 'bg-saffron-100 text-saffron-700',
  COMPLETED: 'bg-turquoise-50 text-turquoise-700',
  CANCELLED: 'bg-bone-100 text-ink-300',
};

/** Portal home: every service in scope as its own card with status counts. */
export default function PortalHomePage() {
  const { user } = useAuth();
  const { data: services, isLoading } = useStaffServices();

  if (isLoading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <span className="size-8 animate-spin rounded-full border-2 border-saffron-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-ink-900">الخدمات والطلبات</h1>
          <p className="mt-2 text-ink-500">كل خدمة في نطاقك مع أعداد طلباتها حسب الحالة.</p>
        </div>
        {user?.role === 'ADMIN' && (
          <Link
            href="/portal/services/new"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-saffron-500 to-saffron-400 px-5 py-2.5 text-sm font-semibold text-ink-950 shadow-[0_8px_20px_-8px_rgba(217,140,15,0.5)]"
          >
            <Plus size={17} weight="bold" />
            إضافة خدمة
          </Link>
        )}
      </div>

      {!services || services.length === 0 ? (
        <div className={`mt-8 ${card} p-12 text-center`}>
          <Tray size={40} weight="duotone" className="mx-auto text-saffron-600" />
          <p className="mt-4 text-ink-500">لا توجد خدمات في نطاقك بعد.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {services.map((s) => (
            <Link key={s.id} href={`/portal/s/${s.id}`} className={`${card} group p-6 transition-all hover:-translate-y-0.5`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-heading text-lg font-semibold text-ink-900 transition-colors group-hover:text-saffron-700">
                    {localize(s.title)}
                  </h2>
                  <p className="mt-1 text-xs text-ink-300">
                    {s.isPublished ? 'منشورة' : 'غير منشورة'} · {s.requestTotal} طلب
                  </p>
                </div>
                <CaretLeft size={18} className="mt-1 shrink-0 text-ink-300" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {Object.entries(s.requestCounts).length === 0 ? (
                  <span className="text-sm text-ink-300">لا طلبات بعد</span>
                ) : (
                  Object.entries(s.requestCounts).map(([status, count]) => (
                    <span
                      key={status}
                      className={`rounded-full px-3 py-1 text-xs font-medium ${COUNT_STYLES[status as RequestStatus] ?? 'bg-bone-100 text-ink-500'}`}
                    >
                      {STATUS_LABELS[status as RequestStatus]} · {count}
                    </span>
                  ))
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
