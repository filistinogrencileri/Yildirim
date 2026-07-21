'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, authErrorMessage, useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';

const schema = z.object({
  code: z.string().regex(/^\d{6}$/, 'رمز من ٦ أرقام'),
});
type FormValues = z.infer<typeof schema>;

export default function VerifyEmailPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await api('/auth/verify-email', { method: 'POST', body: JSON.stringify(values) });
      await refreshUser();
      router.push('/dashboard');
    } catch (e) {
      setServerError(authErrorMessage(e));
    }
  });

  const resend = async () => {
    setServerError(null);
    setResent(false);
    try {
      await api('/auth/resend-verification', { method: 'POST' });
      setResent(true);
    } catch (e) {
      setServerError(authErrorMessage(e));
    }
  };

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold">تأكيد البريد الإلكتروني</h1>
      <p className="mt-1 text-sm leading-6 text-ink-500">
        أرسلنا رمزًا من ٦ أرقام إلى{' '}
        <span dir="ltr" className="text-ink-900">{user?.email ?? 'بريدك'}</span>.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <TextField
          label="رمز التحقق"
          dir="ltr"
          inputMode="numeric"
          maxLength={6}
          className="text-center font-mono text-xl tracking-[0.5em]"
          error={errors.code?.message}
          {...register('code')}
        />
        {serverError && (
          <p role="alert" className="rounded-xl border border-error-300 bg-error-50 px-4 py-3 text-sm text-error-700">
            {serverError}
          </p>
        )}
        {resent && (
          <p className="rounded-xl border border-turquoise-300 bg-turquoise-50 px-4 py-3 text-sm text-turquoise-700">
            تم إرسال رمز جديد.
          </p>
        )}
        <Button type="submit" loading={isSubmitting} className="w-full">
          تأكيد
        </Button>
        <Button type="button" variant="ghost" onClick={resend} className="w-full">
          إعادة إرسال الرمز
        </Button>
      </form>
    </div>
  );
}
