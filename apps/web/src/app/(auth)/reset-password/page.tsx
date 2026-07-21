'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, authErrorMessage } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';

const schema = z
  .object({
    password: z.string().min(8, '٨ أحرف على الأقل'),
    passwordConfirm: z.string(),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    path: ['passwordConfirm'],
    message: 'كلمتا المرور غير متطابقتين',
  });

type FormValues = z.infer<typeof schema>;

function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await api('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, ...values }),
      });
      router.push('/login');
    } catch (e) {
      setServerError(authErrorMessage(e));
    }
  });

  if (!token) {
    return (
      <div className="text-center">
        <h1 className="font-heading text-2xl font-bold">رابط غير صالح</h1>
        <p className="mt-3 text-sm text-ink-500">هذا الرابط ناقص أو منتهي الصلاحية.</p>
        <Link href="/forgot-password" className="mt-6 inline-block text-sm font-medium text-saffron-600">
          اطلب رابطًا جديدًا
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold">كلمة مرور جديدة</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <TextField
          label="كلمة المرور الجديدة"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <TextField
          label="تأكيد كلمة المرور"
          type="password"
          autoComplete="new-password"
          error={errors.passwordConfirm?.message}
          {...register('passwordConfirm')}
        />
        {serverError && (
          <p role="alert" className="rounded-xl border border-error-300 bg-error-50 px-4 py-3 text-sm text-error-700">
            {serverError}
          </p>
        )}
        <Button type="submit" loading={isSubmitting} className="w-full">
          حفظ كلمة المرور
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
