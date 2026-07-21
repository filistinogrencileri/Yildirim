'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, authErrorMessage, useAuth, type SessionUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { SelectField, TextField } from '@/components/ui/field';

const schema = z
  .object({
    fullNameAr: z.string().min(1, 'الاسم الكامل مطلوب').max(120),
    fullNameEn: z
      .string()
      .min(1, 'الاسم بالإنجليزية مطلوب')
      .regex(/^[A-Za-z\s.'-]+$/, 'أحرف لاتينية فقط'),
    email: z.email('بريد إلكتروني غير صالح'),
    phone: z
      .string()
      .regex(/^\+[1-9]\d{7,14}$/, 'رقم دولي يبدأ برمز الدولة، مثال: ‎+905xxxxxxxxx'),
    password: z.string().min(8, '٨ أحرف على الأقل'),
    passwordConfirm: z.string(),
    referralSourceItemId: z.string().optional(),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    path: ['passwordConfirm'],
    message: 'كلمتا المرور غير متطابقتين',
  });

type FormValues = z.infer<typeof schema>;

interface ReferralItem {
  id: string;
  value: string;
  label: { ar: string };
}

export default function RegisterPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<ReferralItem[]>([]);

  useEffect(() => {
    api<{ items: ReferralItem[] }>('/meta/lists/referral_source')
      .then((l) => setReferrals(l.items))
      .catch(() => setReferrals([]));
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const result = await api<{ user: SessionUser; accessToken: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          ...values,
          referralSourceItemId: values.referralSourceItemId || undefined,
        }),
      });
      signIn(result);
      router.push('/dashboard');
    } catch (e) {
      setServerError(authErrorMessage(e));
    }
  });

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold">إنشاء حساب</h1>
      <p className="mt-1 text-sm text-ink-500">ابدأ رحلتك نحو الجامعات التركية.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <TextField
          label="الاسم الكامل (بالعربية)"
          autoComplete="name"
          error={errors.fullNameAr?.message}
          {...register('fullNameAr')}
        />
        <TextField
          label="الاسم الكامل (بالإنجليزية — كما في جواز السفر)"
          dir="ltr"
          className="text-end"
          error={errors.fullNameEn?.message}
          {...register('fullNameEn')}
        />
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
          label="رقم الهاتف (واتساب)"
          type="tel"
          dir="ltr"
          className="text-end"
          placeholder="+905xxxxxxxxx"
          autoComplete="tel"
          error={errors.phone?.message}
          {...register('phone')}
        />
        <TextField
          label="كلمة المرور"
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
        <SelectField
          label="كيف سمعت عنا؟"
          error={errors.referralSourceItemId?.message}
          {...register('referralSourceItemId')}
        >
          <option value="">— اختر —</option>
          {referrals.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label.ar}
            </option>
          ))}
        </SelectField>

        {serverError && (
          <p role="alert" className="rounded-xl border border-error-300 bg-error-50 px-4 py-3 text-sm text-error-700">
            {serverError}
          </p>
        )}

        <Button type="submit" loading={isSubmitting} className="w-full">
          إنشاء الحساب
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        لديك حساب بالفعل؟{' '}
        <Link href="/login" className="font-medium text-saffron-600 hover:text-saffron-700">
          تسجيل الدخول
        </Link>
      </p>
    </div>
  );
}
