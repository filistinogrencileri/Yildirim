'use client';

import Link from 'next/link';
import { ArrowLeft, EnvelopeSimpleOpen, FolderOpen } from '@phosphor-icons/react';
import { localize } from '@yildirim/shared';
import { useAuth } from '@/lib/auth';
import { useProfile } from '@/lib/profile';
import { CompletionRing } from '@/components/ui/completion-ring';

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return (
    <div>
      <h1 className="font-heading text-3xl font-bold">
        أهلًا، <span className="text-saffron-600">{user?.fullNameAr}</span>
      </h1>
      <p className="mt-2 text-ink-500">هذه لوحتك الرئيسية — تابع ملفك وطلباتك من هنا.</p>

      {user && !user.emailVerified && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-saffron-300 bg-saffron-50 p-5">
          <div className="flex items-center gap-3">
            <EnvelopeSimpleOpen size={24} className="text-saffron-600" />
            <p className="text-sm text-ink-700">بريدك الإلكتروني غير مؤكد بعد.</p>
          </div>
          <Link
            href="/verify-email"
            className="rounded-xl border border-saffron-500/50 px-4 py-2 text-sm font-medium text-saffron-700 transition-colors hover:bg-saffron-100"
          >
            أكّد بريدك الآن
          </Link>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* completeness card — the post-login summary from plan module 1 */}
        <div className="rounded-2xl border border-bone-200 bg-white p-7 shadow-[0_8px_32px_-24px_rgba(31,42,92,0.25)]">
          <div className="flex items-center gap-6">
            <div className="relative shrink-0">
              <CompletionRing value={profile?.completeness.percent ?? 0} size={96} />
              <div className="absolute inset-0 grid place-items-center">
                <span className="font-heading text-xl font-bold text-ink-900">
                  {profile?.completeness.percent ?? '…'}٪
                </span>
              </div>
            </div>
            <div className="min-w-0">
              <h2 className="font-heading text-lg font-semibold">اكتمال الملف</h2>
              {profile && profile.completeness.percent === 100 ? (
                <p className="mt-1 text-sm leading-6 text-ink-500">
                  ملفك مكتمل — يمكنك التقديم على أي خدمة متاحة.
                </p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {(profile?.completeness.missing ?? []).slice(0, 4).map((m) => (
                    <li key={`${m.sectionKey}.${m.fieldKey}`} className="flex items-center gap-2 text-sm text-ink-500">
                      <span className="size-1.5 rounded-full bg-saffron-500" />
                      {localize(m.label)}
                    </li>
                  ))}
                  {profile && profile.completeness.missing.length > 4 && (
                    <li className="text-xs text-ink-300">
                      و{profile.completeness.missing.length - 4} حقول أخرى…
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>
          <Link
            href="/profile"
            className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-saffron-600 transition-colors hover:text-saffron-700"
          >
            {profile?.completeness.percent === 100 ? 'عرض الملف' : 'أكمل ملفك الآن'}
            <ArrowLeft size={16} />
          </Link>
        </div>

        <div className="rounded-2xl border border-bone-200 bg-white p-7 shadow-[0_8px_32px_-24px_rgba(31,42,92,0.25)]">
          <FolderOpen size={28} weight="duotone" className="text-saffron-600" />
          <h2 className="font-heading mt-3 text-lg font-semibold">طلباتك</h2>
          <p className="mt-1 text-sm leading-6 text-ink-500">
            عند فتح باب التقديم على الخدمات ستتابع حالة كل طلب من هنا خطوة بخطوة.
          </p>
        </div>
      </div>
    </div>
  );
}
