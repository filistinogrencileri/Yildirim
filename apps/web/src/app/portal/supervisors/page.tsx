'use client';

import { useState } from 'react';
import { Plus, UserCircle } from '@phosphor-icons/react';
import { localize } from '@yildirim/shared';
import { useAuth } from '@/lib/auth';
import { useCreateSupervisor, useSupervisors } from '@/lib/staff';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';

const card = 'rounded-2xl border border-bone-200 bg-white shadow-[0_8px_32px_-24px_rgba(31,42,92,0.25)]';

export default function SupervisorsPage() {
  const { user } = useAuth();
  const { data: supervisors, isLoading } = useSupervisors();
  const create = useCreateSupervisor();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fullNameAr: '', fullNameEn: '', email: '', phone: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [createdMsg, setCreatedMsg] = useState<string | null>(null);

  if (user?.role !== 'ADMIN') return <p className="text-center text-ink-500">هذه الصفحة للمدير فقط.</p>;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const onCreate = async () => {
    setError(null);
    setCreatedMsg(null);
    try {
      await create.mutateAsync(form);
      setCreatedMsg(`تم إنشاء حساب المشرف «${form.fullNameAr}» — سلّمه بيانات الدخول بنفسك.`);
      setForm({ fullNameAr: '', fullNameEn: '', email: '', phone: '', password: '' });
      setShowForm(false);
    } catch {
      setError('تعذّر الإنشاء — تأكد من البيانات وأن البريد غير مستخدم وكلمة المرور ٨ أحرف فأكثر.');
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-ink-900">المشرفون</h1>
          <p className="mt-2 text-ink-500">حسابات المشرفين تُنشأ من هنا فقط — لا تسجيل ذاتي.</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus size={17} weight="bold" />
          مشرف جديد
        </Button>
      </div>

      {createdMsg && (
        <p className="mt-4 rounded-xl border border-turquoise-300 bg-turquoise-50 px-4 py-3 text-sm text-turquoise-700">
          {createdMsg}
        </p>
      )}

      {showForm && (
        <div className={`mt-6 ${card} p-6 sm:p-8`}>
          <h2 className="text-sm font-semibold text-ink-700">بيانات المشرف الجديد</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <TextField label="الاسم (بالعربية)" value={form.fullNameAr} onChange={set('fullNameAr')} />
            <TextField label="الاسم (بالإنجليزية)" dir="ltr" className="text-end" value={form.fullNameEn} onChange={set('fullNameEn')} />
            <TextField label="البريد الإلكتروني" type="email" dir="ltr" className="text-end" value={form.email} onChange={set('email')} />
            <TextField label="رقم الهاتف" type="tel" dir="ltr" className="text-end" placeholder="+905xxxxxxxxx" value={form.phone} onChange={set('phone')} />
            <TextField label="كلمة المرور المبدئية" type="text" dir="ltr" className="text-end" value={form.password} onChange={set('password')} hint="سلّمها للمشرف ليغيّرها من صفحة الإعدادات" />
          </div>
          {error && (
            <p className="mt-4 rounded-xl border border-error-300 bg-error-50 px-4 py-3 text-sm text-error-700">{error}</p>
          )}
          <Button className="mt-5" loading={create.isPending} onClick={() => void onCreate()}>
            إنشاء الحساب
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="grid min-h-[30vh] place-items-center">
          <span className="size-8 animate-spin rounded-full border-2 border-saffron-500 border-t-transparent" />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {(supervisors ?? []).map((s) => (
            <div key={s.id} className={`flex flex-wrap items-center justify-between gap-4 ${card} px-6 py-4`}>
              <div className="flex min-w-0 items-center gap-3">
                <UserCircle size={36} weight="duotone" className="shrink-0 text-saffron-600" />
                <div className="min-w-0">
                  <p className="font-medium text-ink-900">{s.fullNameAr}</p>
                  <p dir="ltr" className="truncate text-end text-xs text-ink-500">{s.email} · {s.phoneE164}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {s.serviceAssignments.length === 0 ? (
                  <span className="text-xs text-ink-300">بلا خدمات مسندة</span>
                ) : (
                  s.serviceAssignments.map((a) => (
                    <span key={a.service.id} className="rounded-full border border-bone-200 bg-bone-50 px-3 py-1 text-xs text-ink-700">
                      {localize(a.service.title)}
                    </span>
                  ))
                )}
              </div>
            </div>
          ))}
          {supervisors?.length === 0 && (
            <div className={`${card} p-10 text-center text-ink-500`}>لا يوجد مشرفون بعد.</div>
          )}
        </div>
      )}
    </div>
  );
}
