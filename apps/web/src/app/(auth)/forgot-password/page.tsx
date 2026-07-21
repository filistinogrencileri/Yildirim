'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, authErrorMessage } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';

const schema = z.object({ email: z.email('بريد إلكتروني غير صالح') });
type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await api('/auth/forgot-password', { method: 'POST', body: JSON.stringify(values) });
      setSent(true);
    } catch (e) {
      setServerError(authErrorMessage(e));
    }
  });

  if (sent) {
    return (
      <div className="text-center">
        <h1 className="font-heading text-2xl font-bold">تحقق من بريدك</h1>
        <p className="mt-3 text-sm leading-6 text-ink-500">
          إن كان البريد مسجلًا لدينا فستصلك رسالة تحتوي رابط استعادة كلمة المرور خلال دقائق.
        </p>
        <Link href="/login" className="mt-6 inline-block text-sm font-medium text-saffron-600">
          العودة لتسجيل الدخول
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold">استعادة كلمة المرور</h1>
      <p className="mt-1 text-sm text-ink-500">أدخل بريدك وسنرسل لك رابط الاستعادة.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <TextField
          label="البريد الإلكتروني"
          type="email"
          dir="ltr"
          className="text-end"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        {serverError && (
          <p role="alert" className="rounded-xl border border-error-300 bg-error-50 px-4 py-3 text-sm text-error-700">
            {serverError}
          </p>
        )}
        <Button type="submit" loading={isSubmitting} className="w-full">
          إرسال الرابط
        </Button>
      </form>
    </div>
  );
}
