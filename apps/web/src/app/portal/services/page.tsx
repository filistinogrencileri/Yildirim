'use client';

import { useState } from 'react';
import { FileZip, Plus, X } from '@phosphor-icons/react';
import { localize } from '@yildirim/shared';
import { downloadFile, useAuth } from '@/lib/auth';
import Link from 'next/link';
import {
  useAdminServices,
  useAssignAllSupervisors,
  useAssignSupervisor,
  useAvailableSupervisors,
  useRemoveSupervisor,
  useSetPublished,
} from '@/lib/staff';

const card = 'rounded-2xl border border-bone-200 bg-white shadow-[0_8px_32px_-24px_rgba(31,42,92,0.25)]';

export default function AdminServicesPage() {
  const { user } = useAuth();
  const { data: services, isLoading } = useAdminServices();
  const { data: supervisors } = useAvailableSupervisors();
  const setPublished = useSetPublished();
  const assign = useAssignSupervisor();
  const assignAll = useAssignAllSupervisors();
  const remove = useRemoveSupervisor();
  const [assigning, setAssigning] = useState<string | null>(null);

  if (user?.role !== 'ADMIN') {
    return <p className="text-center text-ink-500">هذه الصفحة للمدير فقط.</p>;
  }

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
          <h1 className="font-heading text-3xl font-bold text-ink-900">الخدمات</h1>
          <p className="mt-2 text-ink-500">الإنشاء والتحرير والنشر وإسناد المشرفين.</p>
        </div>
        <Link
          href="/portal/services/new"
          className="rounded-xl bg-gradient-to-l from-saffron-500 to-saffron-400 px-5 py-2.5 text-sm font-semibold text-ink-950 shadow-[0_8px_20px_-8px_rgba(217,140,15,0.5)]"
        >
          + خدمة جديدة
        </Link>
      </div>

      <div className="mt-8 space-y-5">
        {(services ?? []).map((s) => (
          <div key={s.id} className={`${card} p-6`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-heading text-lg font-semibold text-ink-900">{localize(s.title)}</h2>
                <p className="mt-1 text-xs text-ink-300">
                  <span dir="ltr">/{s.slug}</span> · {s._count.requests} طلب · {s._count.requirements} متطلب
                  {s.type === 'UNIVERSITY_PLACEMENT' && ` · حتى ${s.maxChoices} رغبات`}
                  {' · '}
                  <Link href={`/portal/services/${s.id}/edit`} className="text-saffron-600 hover:text-saffron-700">
                    تحرير
                  </Link>
                </p>
              </div>
              <div className="flex items-center gap-4">
                {s._count.requests > 0 && (
                  <button
                    onClick={() => void downloadFile(`/staff/exports/service/${s.id}.zip`, `${s.slug}-export.zip`)}
                    className="inline-flex items-center gap-2 rounded-xl border border-ink-900/15 bg-white px-4 py-2 text-sm font-medium text-ink-900 transition-colors hover:border-turquoise-500/60 hover:text-turquoise-700"
                    title="تصدير كل طلاب الخدمة: مجلد لكل طالب فيه ملف Excel وكل مستنداته"
                  >
                    <FileZip size={17} />
                    تصدير ZIP
                  </button>
                )}
              <label className="flex cursor-pointer items-center gap-3">
                <span className={`text-sm ${s.isPublished ? 'text-turquoise-700' : 'text-ink-300'}`}>
                  {s.isPublished ? 'منشورة' : 'غير منشورة'}
                </span>
                <button
                  role="switch"
                  aria-checked={s.isPublished}
                  onClick={() => void setPublished.mutateAsync({ id: s.id, isPublished: !s.isPublished })}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    s.isPublished ? 'bg-turquoise-500' : 'bg-bone-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${
                      s.isPublished ? 'end-0.5' : 'start-0.5'
                    }`}
                  />
                </button>
              </label>
              </div>
            </div>

            <div className="mt-4 border-t border-bone-200 pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-ink-700">المشرفون:</span>
                {s.supervisors.length === 0 && <span className="text-sm text-ink-300">لا يوجد</span>}
                {s.supervisors.map(({ user: u }) => (
                  <span
                    key={u.id}
                    className="inline-flex items-center gap-2 rounded-full border border-bone-200 bg-bone-50 px-3 py-1 text-sm text-ink-700"
                  >
                    {u.fullNameAr}
                    <button
                      onClick={() => void remove.mutateAsync({ serviceId: s.id, userId: u.id })}
                      className="text-ink-300 transition-colors hover:text-error-500"
                      title="إزالة"
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
                {assigning === s.id ? (
                  <select
                    autoFocus
                    className="rounded-full border border-saffron-400 bg-white px-3 py-1 text-sm text-ink-900 outline-none"
                    onChange={(e) => {
                      if (e.target.value) {
                        void assign.mutateAsync({ serviceId: s.id, userId: e.target.value });
                      }
                      setAssigning(null);
                    }}
                    onBlur={() => setAssigning(null)}
                  >
                    <option value="">— اختر مشرفًا —</option>
                    {(supervisors ?? [])
                      .filter((u) => !s.supervisors.some((x) => x.user.id === u.id))
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullNameAr} ({u.email})
                        </option>
                      ))}
                  </select>
                ) : (
                  <>
                    <button
                      onClick={() => setAssigning(s.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-dashed border-bone-300 px-3 py-1 text-sm text-ink-500 transition-colors hover:border-saffron-500/60 hover:text-saffron-700"
                    >
                      <Plus size={13} />
                      إسناد مشرف
                    </button>
                    <button
                      onClick={() => void assignAll.mutateAsync(s.id)}
                      disabled={assignAll.isPending}
                      className="rounded-full border border-dashed border-bone-300 px-3 py-1 text-sm text-ink-500 transition-colors hover:border-turquoise-500/60 hover:text-turquoise-700 disabled:opacity-60"
                    >
                      إسناد الكل
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
