'use client';

import { useState } from 'react';
import { LockKey } from '@phosphor-icons/react';
import { useAuth } from '@/lib/auth';
import { useChangePassword } from '@/lib/staff';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';

/** Settings for admin & supervisor accounts: change password. */
export default function PortalSettingsPage() {
  const { user } = useAuth();
  const change = useChangePassword();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', newPasswordConfirm: '' });
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const onSubmit = async () => {
    setError(null);
    setDone(false);
    if (form.newPassword !== form.newPasswordConfirm) {
      setError('كلمتا المرور الجديدتان غير متطابقتين.');
      return;
    }
    try {
      await change.mutateAsync(form);
      setDone(true);
      setForm({ currentPassword: '', newPassword: '', newPasswordConfirm: '' });
    } catch {
      setError('تعذّر التغيير — تأكد من كلمة المرور الحالية وأن الجديدة ٨ أحرف فأكثر.');
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-heading text-3xl font-bold text-ink-900">الإعدادات</h1>
      <p className="mt-2 text-ink-500">
        حساب {user?.role === 'ADMIN' ? 'المدير' : 'المشرف'}: <span dir="ltr">{user?.email}</span>
      </p>

      <div className="mt-8 rounded-2xl border border-bone-200 bg-white p-8 shadow-[0_8px_32px_-24px_rgba(31,42,92,0.25)]">
        <div className="flex items-center gap-3">
          <LockKey size={24} weight="duotone" className="text-saffron-600" />
          <h2 className="font-heading text-lg font-semibold text-ink-900">تغيير كلمة المرور</h2>
        </div>
        <div className="mt-5 space-y-4">
          <TextField
            label="كلمة المرور الحالية"
            type="password"
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={set('currentPassword')}
          />
          <TextField
            label="كلمة المرور الجديدة"
            type="password"
            autoComplete="new-password"
            value={form.newPassword}
            onChange={set('newPassword')}
          />
          <TextField
            label="تأكيد كلمة المرور الجديدة"
            type="password"
            autoComplete="new-password"
            value={form.newPasswordConfirm}
            onChange={set('newPasswordConfirm')}
          />
          {error && (
            <p className="rounded-xl border border-error-300 bg-error-50 px-4 py-3 text-sm text-error-700">{error}</p>
          )}
          {done && (
            <p className="rounded-xl border border-turquoise-300 bg-turquoise-50 px-4 py-3 text-sm text-turquoise-700">
              تم تغيير كلمة المرور — أُنهيت جلساتك على الأجهزة الأخرى.
            </p>
          )}
          <Button loading={change.isPending} onClick={() => void onSubmit()}>
            حفظ
          </Button>
        </div>
      </div>
    </div>
  );
}
