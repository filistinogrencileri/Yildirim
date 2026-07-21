'use client';

import Link from 'next/link';
import { CaretLeft, FolderOpen } from '@phosphor-icons/react';
import { localize } from '@yildirim/shared';
import { useMyRequests } from '@/lib/catalog';
import { StatusChip } from '@/components/requests/status-chip';

export default function RequestsPage() {
  const { data: requests, isLoading } = useMyRequests();

  if (isLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <span className="size-8 animate-spin rounded-full border-2 border-saffron-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-heading text-3xl font-bold text-ink-900">طلباتي</h1>
      <p className="mt-2 text-ink-500">تابع حالة كل طلب خطوة بخطوة.</p>

      {!requests || requests.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-bone-200 bg-white p-12 text-center shadow-[0_8px_32px_-24px_rgba(31,42,92,0.25)]">
          <FolderOpen size={40} weight="duotone" className="mx-auto text-saffron-600" />
          <p className="mt-4 text-ink-700">لا توجد طلبات بعد.</p>
          <Link href="/#services" className="mt-2 inline-block text-sm font-medium text-saffron-600 hover:text-saffron-700">
            تصفح الخدمات المتاحة ←
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {requests.map((r) => (
            <Link
              key={r.id}
              href={`/requests/${r.id}`}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-bone-200 bg-white p-6 shadow-[0_8px_32px_-24px_rgba(31,42,92,0.25)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_40px_-20px_rgba(31,42,92,0.3)]"
            >
              <div className="min-w-0">
                <p dir="ltr" className="text-end text-xs text-ink-300">{r.referenceNo}</p>
                <h2 className="mt-1 font-heading text-lg font-semibold text-ink-900">
                  {localize(r.service.title)}
                </h2>
                {r.choices.length > 0 && (
                  <p className="mt-1 truncate text-sm text-ink-500">
                    {localize(r.choices[0]!.university.name)} – {localize(r.choices[0]!.major.name)}
                    {r.choices.length > 1 && ` +${r.choices.length - 1}`}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <StatusChip status={r.status} />
                <CaretLeft size={18} className="text-ink-300" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
