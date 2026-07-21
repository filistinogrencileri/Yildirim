'use client';

import { use, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle,
  DownloadSimple,
  FilePdf,
  FileXls,
  UploadSimple,
  User,
  WhatsappLogo,
} from '@phosphor-icons/react';
import {
  localize,
  REQUEST_TRANSITIONS,
  rolesAllowedFor,
  type RequestStatus,
} from '@yildirim/shared';
import { downloadFile, useAuth } from '@/lib/auth';
import { fileHref } from '@/lib/profile';
import { useStaffRequest, useTransition, useUploadLetter } from '@/lib/staff';
import { Button } from '@/components/ui/button';
import { SelectField } from '@/components/ui/field';
import { StatusChip, STATUS_LABELS } from '@/components/requests/status-chip';

const card = 'rounded-2xl border border-bone-200 bg-white shadow-[0_8px_32px_-24px_rgba(31,42,92,0.25)]';

export default function StaffRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const { data: r, isLoading } = useStaffRequest(id);
  const transition = useTransition(id);
  const uploadLetter = useUploadLetter(id);
  const letterInput = useRef<HTMLInputElement>(null);

  const [note, setNote] = useState('');
  const [completing, setCompleting] = useState(false);
  const [outcome, setOutcome] = useState<'ACCEPTED' | 'REJECTED'>('ACCEPTED');
  const [acceptedChoiceId, setAcceptedChoiceId] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const allowedTargets = useMemo(() => {
    if (!r || !user) return [] as RequestStatus[];
    return REQUEST_TRANSITIONS[r.status].filter((to) =>
      rolesAllowedFor(r.status, to).includes(user.role),
    );
  }, [r, user]);

  if (isLoading || !r || !user) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <span className="size-8 animate-spin rounded-full border-2 border-saffron-500 border-t-transparent" />
      </div>
    );
  }

  const isPlacement = r.service.type === 'UNIVERSITY_PLACEMENT';

  const doTransition = async (to: RequestStatus, extra?: { outcome?: 'ACCEPTED' | 'REJECTED'; acceptedChoiceId?: string }) => {
    setActionError(null);
    try {
      await transition.mutateAsync({ to, note: note.trim() || undefined, ...extra });
      setNote('');
      setCompleting(false);
    } catch {
      setActionError('تعذّر تنفيذ الإجراء — تأكد من المتطلبات (الملاحظة/النتيجة/رسالة القبول).');
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/portal" className="inline-flex items-center gap-2 text-sm text-ink-500 hover:text-ink-900">
        <ArrowRight size={16} />
        قائمة الطلبات
      </Link>

      {/* header */}
      <div className={`mt-6 flex flex-wrap items-center justify-between gap-4 ${card} p-6`}>
        <div className="flex items-center gap-4">
          {r.student.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fileHref(r.student.photoUrl)} alt="" className="size-16 rounded-full border-2 border-saffron-400 object-cover" />
          ) : (
            <span className="grid size-16 place-items-center rounded-full bg-bone-100 text-ink-300">
              <User size={26} />
            </span>
          )}
          <div>
            <h1 className="font-heading text-xl font-bold text-ink-900">{r.student.fullNameAr}</h1>
            <p dir="ltr" className="text-end text-sm text-ink-500">{r.student.fullNameEn}</p>
            <p className="mt-0.5 text-xs text-ink-300">
              <span dir="ltr">{r.referenceNo}</span> · {localize(r.service.title)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() =>
              void downloadFile(
                `/staff/exports/student/${r.student.id}.xlsx`,
                `${r.student.fullNameEn}.xlsx`,
              )
            }
            className="inline-flex items-center gap-2 rounded-xl border border-ink-900/15 bg-white px-4 py-2.5 text-sm font-medium text-ink-900 transition-colors hover:border-turquoise-500/60 hover:text-turquoise-700"
            title="تصدير بيانات الطالب مع صورته في ملف Excel"
          >
            <FileXls size={19} />
            تصدير Excel
          </button>
          <a
            href={r.student.whatsapp}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <WhatsappLogo size={19} weight="fill" />
            واتساب
          </a>
          <StatusChip status={r.status} />
        </div>
      </div>

      {/* actions */}
      {allowedTargets.length > 0 && (
        <div className={`mt-6 ${card} p-6`}>
          <h2 className="text-sm font-semibold text-ink-700">إجراءات</h2>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="ملاحظة (إلزامية عند «بحاجة لاستكمال»)…"
            className="mt-3 w-full rounded-xl border border-bone-300 bg-white px-4 py-3 text-sm text-ink-900 placeholder:text-ink-300 outline-none transition-all focus:border-saffron-500 focus:shadow-[0_0_0_3px_rgba(245,166,35,0.15)]"
          />
          <div className="mt-4 flex flex-wrap gap-3">
            {allowedTargets.map((to) =>
              to === 'COMPLETED' && isPlacement ? (
                <Button key={to} variant={completing ? 'secondary' : 'primary'} onClick={() => setCompleting((v) => !v)}>
                  {completing ? 'إخفاء إنهاء الطلب' : 'إنهاء الطلب (النتيجة)'}
                </Button>
              ) : (
                <Button
                  key={to}
                  variant={to === 'CANCELLED' ? 'ghost' : to === 'NEEDS_ACTION' ? 'secondary' : 'primary'}
                  loading={transition.isPending}
                  onClick={() => void doTransition(to)}
                  className={to === 'CANCELLED' ? '!text-error-700' : ''}
                >
                  {STATUS_LABELS[to]}
                </Button>
              ),
            )}
          </div>

          {completing && (
            <div className="mt-5 rounded-xl border border-bone-200 bg-bone-50 p-5">
              <div className="flex flex-wrap gap-4">
                {(['ACCEPTED', 'REJECTED'] as const).map((o) => (
                  <label key={o} className="flex cursor-pointer items-center gap-2 text-sm text-ink-900">
                    <input
                      type="radio"
                      name="outcome"
                      checked={outcome === o}
                      onChange={() => setOutcome(o)}
                      className="size-4 accent-saffron-500"
                    />
                    {o === 'ACCEPTED' ? 'مقبول 🎉' : 'مرفوض'}
                  </label>
                ))}
              </div>

              {outcome === 'ACCEPTED' && (
                <div className="mt-4 space-y-4">
                  <SelectField
                    label="الرغبة المقبولة"
                    value={acceptedChoiceId}
                    onChange={(e) => setAcceptedChoiceId(e.target.value)}
                  >
                    <option value="">— اختر —</option>
                    {r.choices.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.rank}. {localize(c.university.name)} – {localize(c.major.name)}
                      </option>
                    ))}
                  </SelectField>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => letterInput.current?.click()}
                      disabled={uploadLetter.isPending}
                      className="inline-flex items-center gap-2 rounded-xl border border-ink-900/15 bg-white px-4 py-2.5 text-sm font-medium text-ink-900 transition-colors hover:border-saffron-600/60 hover:text-saffron-700"
                    >
                      {uploadLetter.isPending ? (
                        <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <UploadSimple size={17} />
                      )}
                      {r.acceptanceLetterUrl ? 'استبدال رسالة القبول' : 'رفع رسالة القبول (PDF)'}
                    </button>
                    {r.acceptanceLetterUrl && (
                      <a
                        href={fileHref(r.acceptanceLetterUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-turquoise-700 hover:underline"
                      >
                        <FilePdf size={17} />
                        عرض الرسالة المرفوعة
                      </a>
                    )}
                    <input
                      ref={letterInput}
                      type="file"
                      accept=".pdf,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void uploadLetter.mutateAsync(f).finally(() => {
                          if (letterInput.current) letterInput.current.value = '';
                        });
                      }}
                    />
                  </div>
                </div>
              )}

              <Button
                className="mt-5"
                loading={transition.isPending}
                disabled={outcome === 'ACCEPTED' && (!acceptedChoiceId || !r.acceptanceLetterUrl)}
                onClick={() =>
                  void doTransition('COMPLETED', {
                    outcome,
                    acceptedChoiceId: outcome === 'ACCEPTED' ? acceptedChoiceId : undefined,
                  })
                }
              >
                تأكيد النتيجة النهائية
              </Button>
            </div>
          )}

          {actionError && (
            <p className="mt-4 rounded-xl border border-error-300 bg-error-50 px-4 py-3 text-sm text-error-700">
              {actionError}
            </p>
          )}
        </div>
      )}

      {/* choices */}
      {r.choices.length > 0 && (
        <div className={`mt-6 ${card} p-6`}>
          <h2 className="text-sm font-semibold text-ink-700">الرغبات</h2>
          <ul className="mt-3 space-y-2">
            {r.choices.map((c) => (
              <li
                key={c.id}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
                  c.id === r.acceptedChoiceId ? 'border-turquoise-300 bg-turquoise-50' : 'border-bone-200 bg-bone-50'
                }`}
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-ink-700 shadow-sm">
                  {c.rank}
                </span>
                {localize(c.university.name)} – {localize(c.major.name)}
                {c.id === r.acceptedChoiceId && (
                  <CheckCircle size={17} weight="fill" className="ms-auto text-turquoise-600" />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* snapshot answers */}
      <div className={`mt-6 ${card} p-6`}>
        <h2 className="text-sm font-semibold text-ink-700">بيانات الطلب (لحظة التقديم)</h2>
        <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          <div className="flex items-baseline justify-between gap-3 border-b border-bone-200 pb-2">
            <dt className="text-sm text-ink-500">البريد الإلكتروني</dt>
            <dd dir="ltr" className="text-sm font-medium text-ink-900">{r.student.email}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 border-b border-bone-200 pb-2">
            <dt className="text-sm text-ink-500">الهاتف</dt>
            <dd dir="ltr" className="text-sm font-medium text-ink-900">{r.student.phoneE164}</dd>
          </div>
          {r.answers.map((a) => (
            <div key={a.fieldKey} className="flex items-baseline justify-between gap-3 border-b border-bone-200 pb-2">
              <dt className="text-sm text-ink-500">{localize(a.label)}</dt>
              <dd className="text-sm font-medium text-ink-900">
                {a.fileUrl ? (
                  <a
                    href={fileHref(a.fileUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-turquoise-700 hover:underline"
                  >
                    <DownloadSimple size={15} />
                    {a.fileName ?? 'ملف'}
                  </a>
                ) : a.value === null || a.value === '' ? (
                  <span className="text-ink-300">—</span>
                ) : (
                  String(a.value)
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* history */}
      <div className={`mt-6 ${card} p-6`}>
        <h2 className="text-sm font-semibold text-ink-700">سجل الحالة</h2>
        <ol className="mt-4">
          {r.history.map((h, i) => (
            <li key={i} className="relative flex gap-4 pb-5 last:pb-0">
              {i !== r.history.length - 1 && (
                <span className="absolute right-[5px] top-4 h-full w-px bg-bone-300" />
              )}
              <span
                className={`relative mt-1.5 size-3 shrink-0 rounded-full ${
                  i === r.history.length - 1 ? 'bg-saffron-500 shadow-[0_0_10px_rgba(245,166,35,0.6)]' : 'bg-bone-300'
                }`}
              />
              <div>
                <p className="text-sm font-medium text-ink-900">{STATUS_LABELS[h.toStatus]}</p>
                {h.note && <p className="mt-0.5 text-xs leading-5 text-ink-500">{h.note}</p>}
                <p className="mt-0.5 text-xs text-ink-300">
                  {new Date(h.createdAt).toLocaleString('ar', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
