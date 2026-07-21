'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, authErrorMessage, useAuth, type SessionUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';

const schema = z.object({
  email: z.email('بريد إلكتروني غير صالح'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const result = await api<{ user: SessionUser; accessToken: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      signIn(result);
      router.push(result.user.role === 'STUDENT' ? '/dashboard' : '/portal');
    } catch (e) {
      setServerError(authErrorMessage(e));
    }
  });

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold">تسجيل الدخول</h1>
      <p className="mt-1 text-sm text-ink-500">أهلًا بعودتك.</p>

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
        <TextField
          label="كلمة المرور"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />

        <div className="text-start">
          <Link
            href="/forgot-password"
            className="text-sm text-ink-500 transition-colors hover:text-saffron-700"
          >
            نسيت كلمة المرور؟
          </Link>
        </div>

        {serverError && (
          <p role="alert" className="rounded-xl border border-error-300 bg-error-50 px-4 py-3 text-sm text-error-700">
            {serverError}
          </p>
        )}

        <Button type="submit" loading={isSubmitting} className="w-full">
          دخول
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        ليس لديك حساب؟{' '}
        <Link href="/register" className="font-medium text-saffron-600 hover:text-saffron-700">
          أنشئ حسابك
        </Link>
      </p>
    </div>
  );
}
