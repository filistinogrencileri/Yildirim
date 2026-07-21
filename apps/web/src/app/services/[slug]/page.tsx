'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle, Plus, Trash, WarningCircle } from '@phosphor-icons/react';
import { localize } from '@yildirim/shared';
import { useAuth } from '@/lib/auth';
import { useApply, useEligibility, useService, type ServiceDetail } from '@/lib/catalog';
import { Button } from '@/components/ui/button';
import { SelectField } from '@/components/ui/field';
import { StatusChip } from '@/components/requests/status-chip';

interface ChoiceRow {
  universityId: string;
  majorId: string;
}

function ChoicePicker({
  service,
  onSubmit,
  submitting,
  error,
}: {
  service: ServiceDetail;
  onSubmit: (choices: ChoiceRow[]) => void;
  submitting: boolean;
  error: string | null;
}) {
  const max = service.choiceMode === 'SINGLE' ? 1 : service.maxChoices;
  const [rows, setRows] = useState<ChoiceRow[]>([{ universityId: '', majorId: '' }]);

  const complete = rows.every((r) => r.universityId && r.majorId);
  const duplicates = useMemo(() => {
    const keys = rows.map((r) => `${r.universityId}:${r.majorId}`);
    return new Set(keys).size !== keys.length;
  }, [rows]);

  const set = (i: number, patch: Partial<ChoiceRow>) =>
    setRows((prev) => prev.map((r, x) => (x === i ? { ...r, ...patch } : r)));

  return (
    <div>
      <h3 className="font-heading text-lg font-semibold text-ink-900">
        {max > 1 ? `رغباتك (حتى ${max} خيارات، بالترتيب)` : 'اختر الجامعة والتخصص'}
      </h3>
      <div className="mt-4 space-y-4">
        {rows.map((row, i) => (
          <div key={i} className="rounded-xl border border-bone-200 bg-bone-50 p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="grid size-7 place-items-center rounded-full bg-saffron-100 text-sm font-bold text-saffron-700">
                {i + 1}
              </span>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => setRows((prev) => prev.filter((_, x) => x !== i))}
                  className="inline-flex items-center gap-1.5 text-sm text-error-500 hover:text-error-700"
                >
                  <Trash size={15} />
                  إزالة
                </button>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="الجامعة"
                value={row.universityId}
                onChange={(e) => set(i, { universityId: e.target.value })}
              >
                <option value="">— اختر —</option>
                {service.universities.map((u) => (
                  <option key={u.id} value={u.id}>
                    {localize(u.name)}
                    {u.city ? ` — ${u.city}` : ''}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="التخصص"
                value={row.majorId}
                onChange={(e) => set(i, { majorId: e.target.value })}
              >
                <option value="">— اختر —</option>
                {service.majors.map((m) => (
                  <option key={m.id} value={m.id}>
                    {localize(m.name)}
                  </option>
                ))}
              </SelectField>
            </div>
          </div>
        ))}
      </div>

      {rows.length < max && (
        <button
          type="button"
          onClick={() => setRows((prev) => [...prev, { universityId: '', majorId: '' }])}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-dashed border-bone-300 px-5 py-2.5 text-sm font-medium text-ink-500 transition-colors hover:border-saffron-500/60 hover:text-saffron-700"
        >
          <Plus size={16} />
          إضافة رغبة
        </button>
      )}

      {duplicates && (
        <p className="mt-3 text-sm text-error-700">لا يمكن تكرار نفس الجامعة والتخصص في رغبتين.</p>
      )}
      {error && (
        <p className="mt-3 rounded-xl border border-error-300 bg-error-50 px-4 py-3 text-sm text-error-700">
          {error}
        </p>
      )}

      <Button
        className="mt-6 w-full sm:w-auto"
        disabled={!complete || duplicates}
        loading={submitting}
        onClick={() => onSubmit(rows)}
      >
        تقديم الطلب
      </Button>
      <p className="mt-2 text-xs text-ink-300">
        عند التقديم تُؤخذ نسخة من بياناتك الحالية وترسل للمراجعة — تأكد من اكتمال ملفك أولًا.
      </p>
    </div>
  );
}

export default function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { data: service, isLoading } = useService(slug);
  const isStudent = !!user && user.role === 'STUDENT';
  const { data: eligibility } = useEligibility(slug, isStudent);
  const apply = useApply();
  const [applyError, setApplyError] = useState<string | null>(null);

  if (isLoading || authLoading) {
    return (
      <main className="grid min-h-screen place-items-center">
        <span className="size-8 animate-spin rounded-full border-2 border-saffron-500 border-t-transparent" />
      </main>
    );
  }
  if (!service) {
    return (
      <main className="grid min-h-screen place-items-center px-4 text-center">
        <div>
          <p className="text-lg text-ink-500">هذه الخدمة غير متاحة.</p>
          <Link href="/" className="mt-4 inline-block text-saffron-600 hover:text-saffron-700">
            العودة للرئيسية
          </Link>
        </div>
      </main>
    );
  }

  const onSubmit = async (choices: ChoiceRow[]) => {
    setApplyError(null);
    try {
      const created = await apply.mutateAsync({ serviceSlug: slug, choices });
      router.push(`/requests/${created.id}`);
    } catch {
      setApplyError('تعذّر تقديم الطلب — تحقق من اكتمال ملفك ثم أعد المحاولة.');
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-4 pb-24 pt-8">
      <Link
        href={isStudent ? '/dashboard' : '/'}
        className="inline-flex items-center gap-2 text-sm text-ink-500 transition-colors hover:text-ink-900"
      >
        <ArrowRight size={16} />
        عودة
      </Link>

      {/* service header */}
      <div className="mt-6 rounded-2xl border border-bone-200 bg-white p-8 shadow-[0_8px_32px_-24px_rgba(31,42,92,0.25)]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-saffron-300 bg-saffron-50 px-3 py-1 text-xs text-saffron-700">
            {service.type === 'UNIVERSITY_PLACEMENT' ? 'مفاضلة جامعية' : 'خدمة تعليمية'}
          </span>
          {service.type === 'UNIVERSITY_PLACEMENT' && service.choiceMode === 'MULTI' && (
            <span className="rounded-full border border-ink-100 px-3 py-1 text-xs text-ink-500">
              حتى {service.maxChoices} رغبات مرتبة
            </span>
          )}
        </div>
        <h1 className="mt-4 font-heading text-3xl font-bold text-ink-900">{localize(service.title)}</h1>
        <p className="mt-3 leading-8 text-ink-500">{localize(service.description)}</p>

        {service.requirements.length > 0 && (
          <div className="mt-6 border-t border-bone-200 pt-5">
            <h2 className="text-sm font-semibold text-ink-700">المتطلبات</h2>
            {isStudent ? (
              // personalized: checked against the logged-in student's profile
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {service.requirements.map((r) => {
                  const missing = eligibility?.missing.some((m) => m.fieldId === r.fieldId) ?? false;
                  return (
                    <li key={r.fieldId} className="flex items-center gap-2 text-sm">
                      {missing ? (
                        <WarningCircle size={17} className="shrink-0 text-saffron-600" />
                      ) : (
                        <CheckCircle size={17} weight="fill" className="shrink-0 text-turquoise-600" />
                      )}
                      <span className={missing ? 'text-ink-900' : 'text-ink-500'}>{localize(r.label)}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              // public view: category overview only — nothing personalized
              <>
                <p className="mt-2 text-sm text-ink-500">
                  يتطلب التقديم اكتمال الفئات التالية في ملفك لدى المنصة:
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[...new Map(service.requirements.map((r) => [r.sectionKey, r.sectionTitle])).values()].map(
                    (title, i) => (
                      <span
                        key={i}
                        className="rounded-full border border-bone-200 bg-bone-50 px-4 py-1.5 text-sm text-ink-700"
                      >
                        {localize(title)}
                      </span>
                    ),
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* action panel */}
      <div className="mt-6 rounded-2xl border border-bone-200 bg-white p-8 shadow-[0_8px_32px_-24px_rgba(31,42,92,0.25)]">
        {!user ? (
          <div className="text-center">
            <p className="text-ink-700">سجّل دخولك أو أنشئ حسابًا للتقديم على هذه الخدمة.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link
                href="/register"
                className="rounded-xl bg-gradient-to-l from-saffron-500 to-saffron-400 px-6 py-3 font-semibold text-ink-950 shadow-[0_8px_20px_-8px_rgba(217,140,15,0.5)]"
              >
                أنشئ حسابك
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-ink-900/15 px-6 py-3 font-medium text-ink-900 hover:border-saffron-600/60 hover:text-saffron-700"
              >
                تسجيل الدخول
              </Link>
            </div>
          </div>
        ) : !isStudent ? (
          <p className="text-center text-ink-500">التقديم متاح لحسابات الطلاب فقط.</p>
        ) : eligibility?.existingRequest ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <StatusChip status={eligibility.existingRequest.status} />
              <p className="text-sm text-ink-700">
                لديك طلب قائم على هذه الخدمة برقم{' '}
                <span dir="ltr">{eligibility.existingRequest.referenceNo}</span>
              </p>
            </div>
            <Link
              href={`/requests/${eligibility.existingRequest.id}`}
              className="text-sm font-medium text-saffron-600 hover:text-saffron-700"
            >
              تابع طلبك ←
            </Link>
          </div>
        ) : eligibility && !eligibility.eligible ? (
          <div>
            <h3 className="font-heading text-lg font-semibold text-ink-900">أكمل ملفك أولًا</h3>
            <p className="mt-1 text-sm text-ink-500">
              تنقصك الحقول التالية قبل التقديم على هذه الخدمة:
            </p>
            <ul className="mt-4 space-y-2">
              {eligibility.photoMissing && (
                <li className="flex items-center gap-2 text-sm text-ink-900">
                  <WarningCircle size={17} className="text-saffron-600" />
                  الصورة الشخصية
                </li>
              )}
              {eligibility.missing.map((m) => (
                <li key={m.fieldId} className="flex items-center gap-2 text-sm text-ink-900">
                  <WarningCircle size={17} className="text-saffron-600" />
                  {localize(m.label)}
                  <span className="text-xs text-ink-300">({localize(m.sectionTitle)})</span>
                </li>
              ))}
            </ul>
            <Link
              href="/profile"
              className="mt-6 inline-block rounded-xl bg-gradient-to-l from-saffron-500 to-saffron-400 px-6 py-3 font-semibold text-ink-950 shadow-[0_8px_20px_-8px_rgba(217,140,15,0.5)]"
            >
              أكمل ملفك الآن
            </Link>
          </div>
        ) : service.type === 'UNIVERSITY_PLACEMENT' ? (
          <ChoicePicker
            service={service}
            onSubmit={(c) => void onSubmit(c)}
            submitting={apply.isPending}
            error={applyError}
          />
        ) : (
          <div>
            {applyError && (
              <p className="mb-3 rounded-xl border border-error-300 bg-error-50 px-4 py-3 text-sm text-error-700">
                {applyError}
              </p>
            )}
            <Button loading={apply.isPending} onClick={() => void onSubmit([])}>
              تقديم الطلب
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
