'use client';

import Link from 'next/link';
import { ArrowRight } from '@phosphor-icons/react';
import { useAuth } from '@/lib/auth';
import { ServiceForm } from '@/components/portal/service-form';

export default function NewServicePage() {
  const { user } = useAuth();
  if (user?.role !== 'ADMIN') return <p className="text-center text-ink-500">هذه الصفحة للمدير فقط.</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/portal/services" className="inline-flex items-center gap-2 text-sm text-ink-500 hover:text-ink-900">
        <ArrowRight size={16} />
        الخدمات
      </Link>
      <h1 className="mt-4 font-heading text-2xl font-bold text-ink-900">خدمة جديدة</h1>
      <div className="mt-6">
        <ServiceForm />
      </div>
    </div>
  );
}
