'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CaretLeft, LockSimple, WarningCircle } from '@phosphor-icons/react';
import { localize } from '@yildirim/shared';
import { useMyServices, type MyService } from '@/lib/catalog';
import { StatusChip } from '@/components/requests/status-chip';

const card = 'rounded-2xl border border-bone-200 bg-white p-7 shadow-[0_8px_32px_-24px_rgba(31,42,92,0.25)]';

function ServiceBadge({ s }: { s: MyService }) {
  return (
    <div className="flex items-center gap-2">
      <span className="rounded-full border border-saffron-300 bg-saffron-50 px-3 py-1 text-xs text-saffron-700">
        {s.type === 'UNIVERSITY_PLACEMENT' ? 'مفاضلة جامعية' : 'خدمة تعليمية'}
      </span>
      {s.type === 'UNIVERSITY_PLACEMENT' && s.choiceMode === 'MULTI' && (
        <span className="rounded-full border border-ink-100 px-3 py-1 text-xs text-ink-500">
          حتى {s.maxChoices} رغبات
        </span>
      )}
    </div>
  );
}

/** One service card that adapts to the student's eligibility. */
function ServiceCard({ s }: { s: MyService }) {
  const [showGate, setShowGate] = useState(false);

  // 1) already has a request → follow it
  if (s.existingRequest) {
    return (
      <Link href={`/requests/${s.existingRequest.id}`} className={`group block ${card} transition-all hover:-translate-y-1`}>
        <ServiceBadge s={s} />
        <h3 className="mt-4 font-heading text-lg font-semibold text-ink-900">{localize(s.title)}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink-500">{localize(s.description)}</p>
        <div className="mt-5 flex items-center justify-between">
          <StatusChip status={s.existingRequest.status} size="sm" />
          <span className="inline-flex items-center gap-1 text-sm font-medium text-saffron-600">
            تابع طلبك <CaretLeft size={15} />
          </span>
        </div>
      </Link>
    );
  }

  // 2) eligible → apply
  if (s.eligible) {
    return (
      <Link href={`/services/${s.slug}`} className={`group block ${card} transition-all hover:-translate-y-1 hover:shadow-[0_16px_40px_-20px_rgba(31,42,92,0.3)]`}>
        <ServiceBadge s={s} />
        <h3 className="mt-4 font-heading text-lg font-semibold text-ink-900 transition-colors group-hover:text-saffron-700">
          {localize(s.title)}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink-500">{localize(s.description)}</p>
        <span className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-saffron-500 to-saffron-400 px-5 py-2 text-sm font-semibold text-ink-950 shadow-[0_8px_20px_-8px_rgba(217,140,15,0.5)]">
          قدّم الآن
          <ArrowLeft size={15} />
        </span>
      </Link>
    );
  }

  // 3) ineligible → locked/faded; click reveals what's missing
  return (
    <button
      type="button"
      onClick={() => setShowGate((v) => !v)}
      aria-expanded={showGate}
      className={`block w-full cursor-pointer text-start ${card} relative overflow-hidden transition-all`}
    >
      {/* fade overlay */}
      <span aria-hidden className="pointer-events-none absolute inset-0 bg-white/45" />
      <span className="absolute end-4 top-4 grid size-9 place-items-center rounded-full border border-bone-200 bg-white text-ink-400 shadow-sm">
        <LockSimple size={17} weight="fill" />
      </span>

      <div className="opacity-55">
        <ServiceBadge s={s} />
        <h3 className="mt-4 font-heading text-lg font-semibold text-ink-900">{localize(s.title)}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink-500">{localize(s.description)}</p>
      </div>

      {showGate ? (
        <div className="relative mt-5 rounded-xl border border-saffron-300 bg-saffron-50 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-saffron-800">
            <WarningCircle size={17} weight="fill" />
            أكمل الحقول التالية لتتمكن من التقديم:
          </p>
          <ul className="mt-2 space-y-1 ps-6 text-sm text-ink-700">
            {s.photoMissing && <li className="list-disc">الصورة الشخصية</li>}
            {s.missing.map((m) => (
              <li key={m.fieldId} className="list-disc">
                {localize(m.label)} <span className="text-xs text-ink-400">({localize(m.sectionTitle)})</span>
              </li>
            ))}
          </ul>
          <Link
            href="/profile"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-saffron-500 to-saffron-400 px-5 py-2 text-sm font-semibold text-ink-950 shadow-[0_8px_20px_-8px_rgba(217,140,15,0.5)]"
          >
            أكمل ملفك الآن
            <ArrowLeft size={15} />
          </Link>
        </div>
      ) : (
        <p className="relative mt-5 text-sm font-medium text-ink-400">
          اضغط لعرض ما ينقصك للتقديم على هذه الخدمة
        </p>
      )}
    </button>
  );
}

export default function StudentServicesPage() {
  const { data: services, isLoading } = useMyServices();

  return (
    <div>
      <h1 className="font-heading text-3xl font-bold text-ink-900">الخدمات</h1>
      <p className="mt-2 text-ink-500">تصفّح الخدمات المتاحة وقدّم عليها مباشرة. الخدمات التي تنقصها بيانات في ملفك تظهر مقفلة.</p>

      {isLoading ? (
        <div className="grid min-h-[40vh] place-items-center">
          <span className="size-8 animate-spin rounded-full border-2 border-saffron-500 border-t-transparent" />
        </div>
      ) : !services || services.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-bone-200 bg-white p-12 text-center text-ink-500">
          لا توجد خدمات متاحة حاليًا.
        </p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <ServiceCard key={s.id} s={s} />
          ))}
        </div>
      )}
    </div>
  );
}
