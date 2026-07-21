'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle, DownloadSimple, Medal, WarningCircle } from '@phosphor-icons/react';
import { localize, REQUEST_TRANSITIONS } from '@yildirim/shared';
import { fileHref } from '@/lib/profile';
import { useCancelRequest, useMyRequest, useResubmit } from '@/lib/catalog';
import { Button } from '@/components/ui/button';
import { StatusChip, STATUS_LABELS } from '@/components/requests/status-chip';

export default function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: r, isLoading } = useMyRequest(id);
  const resubmit = useResubmit(id);
  const cancel = useCancelRequest(id);

  if (isLoading || !r) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <span className="size-8 animate-spin rounded-full border-2 border-saffron-500 border-t-transparent" />
      </div>
    );
  }

  const latestNote = [...r.history].reverse().find((h) => h.note)?.note ?? null;
  const acceptedChoice = r.choices.find((c) => c.id === r.acceptedChoiceId);
  const registeredChoice = acceptedChoice ?? r.choices[0];
  const canCancel = REQUEST_TRANSITIONS[r.status].includes('CANCELLED') && r.status === 'SUBMITTED';

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/requests" className="inline-flex items-center gap-2 text-sm text-ink-500 hover:text-ink-900">
        <ArrowRight size={16} />
        كل الطلبات
      </Link>

      <div className="mt-6 rounded-2xl border border-bone-200 bg-white p-8 shadow-[0_8px_32px_-24px_rgba(31,42,92,0.25)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p dir="ltr" className="text-end text-xs text-ink-300">{r.referenceNo}</p>
            <h1 className="mt-1 font-heading text-2xl font-bold text-ink-900">
              {localize(r.service.title)}
            </h1>
            {r.service.type === 'UNIVERSITY_PLACEMENT' && registeredChoice && r.status !== 'CANCELLED' && (
              <p className="mt-2 text-sm text-ink-500">
                {r.outcome === 'ACCEPTED' ? 'مقبول في ' : 'مسجّل في '}
                <span className="font-medium text-ink-900">
                  {localize(registeredChoice.university.name)} – {localize(registeredChoice.major.name)}
                </span>
              </p>
            )}
          </div>
          <StatusChip status={r.status} />
        </div>

        {/* outcome banners */}
        {r.outcome === 'ACCEPTED' && (
          <div className="mt-6 rounded-xl border border-turquoise-300 bg-turquoise-50 p-6">
            <div className="flex items-center gap-3">
              <Medal size={28} weight="duotone" className="text-turquoise-600" />
              <div>
                <h2 className="font-heading text-lg font-bold text-turquoise-700">مبروك! تم قبولك 🎉</h2>
                <p className="mt-0.5 text-sm text-turquoise-700/80">
                  قبولك الرسمي جاهز — حمّل رسالة القبول من الزر أدناه.
                </p>
              </div>
            </div>
            {r.acceptanceLetterUrl && (
              <a
                href={fileHref(r.acceptanceLetterUrl)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-turquoise-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-turquoise-700"
              >
                <DownloadSimple size={17} />
                تحميل رسالة القبول
              </a>
            )}
          </div>
        )}
        {r.outcome === 'REJECTED' && (
          <div className="mt-6 rounded-xl border border-ink-100 bg-bone-50 p-6 text-sm leading-6 text-ink-700">
            نأسف — لم يُقبل طلبك هذه المرة. تواصل معنا لدراسة الخيارات البديلة المتاحة لك.
          </div>
        )}
        {r.status === 'NEEDS_ACTION' && (
          <div className="mt-6 rounded-xl border border-error-300 bg-error-50 p-6">
            <div className="flex items-start gap-3">
              <WarningCircle size={24} className="shrink-0 text-error-700" />
              <div>
                <h2 className="font-semibold text-error-700">مطلوب استكمال</h2>
                {latestNote && <p className="mt-1 text-sm leading-6 text-error-700/90">{latestNote}</p>}
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href="/profile"
                    className="rounded-xl border border-error-300 bg-white px-4 py-2 text-sm font-medium text-error-700 hover:bg-error-50"
                  >
                    عدّل ملفك
                  </Link>
                  <Button
                    variant="primary"
                    className="!px-4 !py-2 text-sm"
                    loading={resubmit.isPending}
                    onClick={() => void resubmit.mutateAsync()}
                  >
                    أعد الإرسال للمراجعة
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* choices */}
        {r.choices.length > 0 && (
          <div className="mt-6 border-t border-bone-200 pt-5">
            <h2 className="text-sm font-semibold text-ink-700">رغباتك</h2>
            <ul className="mt-3 space-y-2">
              {r.choices.map((c) => (
                <li
                  key={c.id}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
                    c.id === r.acceptedChoiceId
                      ? 'border-turquoise-300 bg-turquoise-50'
                      : 'border-bone-200 bg-bone-50'
                  }`}
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-ink-700 shadow-sm">
                    {c.rank}
                  </span>
                  <span className="text-ink-900">
                    {localize(c.university.name)} – {localize(c.major.name)}
                  </span>
                  {c.id === r.acceptedChoiceId && (
                    <CheckCircle size={17} weight="fill" className="ms-auto text-turquoise-600" />
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* timeline */}
        <div className="mt-6 border-t border-bone-200 pt-5">
          <h2 className="text-sm font-semibold text-ink-700">مسار الطلب</h2>
          <ol className="mt-4 space-y-0">
            {r.history.map((h, i) => {
              const last = i === r.history.length - 1;
              return (
                <li key={i} className="relative flex gap-4 pb-6 last:pb-0">
                  {!last && <span className="absolute right-[5px] top-4 h-full w-px bg-bone-300" />}
                  <span
                    className={`relative mt-1.5 size-3 shrink-0 rounded-full ${
                      last ? 'bg-saffron-500 shadow-[0_0_10px_rgba(245,166,35,0.6)]' : 'bg-bone-300'
                    }`}
                  />
                  <div>
                    <p className={`text-sm font-medium ${last ? 'text-ink-900' : 'text-ink-500'}`}>
                      {STATUS_LABELS[h.toStatus]}
                    </p>
                    {h.note && <p className="mt-0.5 text-xs leading-5 text-ink-500">{h.note}</p>}
                    <p className="mt-0.5 text-xs text-ink-300">
                      {new Date(h.at).toLocaleDateString('ar', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {canCancel && (
          <div className="mt-6 border-t border-bone-200 pt-5 text-start">
            <button
              onClick={() => {
                if (confirm('هل أنت متأكد من إلغاء الطلب؟')) void cancel.mutateAsync();
              }}
              className="text-sm text-error-500 transition-colors hover:text-error-700"
            >
              إلغاء الطلب
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
