'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowRight } from '@phosphor-icons/react';
import { useAuth } from '@/lib/auth';
import { useAdminServices } from '@/lib/staff';
import { ServiceForm } from '@/components/portal/service-form';

export default function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const { data: services, isLoading } = useAdminServices();

  if (user?.role !== 'ADMIN') return <p className="text-center text-ink-500">هذه الصفحة للمدير فقط.</p>;

  const existing = services?.find((s) => s.id === id);
  if (isLoading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <span className="size-8 animate-spin rounded-full border-2 border-saffron-500 border-t-transparent" />
      </div>
    );
  }
  if (!existing) return <p className="text-center text-ink-500">الخدمة غير موجودة.</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/portal/services" className="inline-flex items-center gap-2 text-sm text-ink-500 hover:text-ink-900">
        <ArrowRight size={16} />
        الخدمات
      </Link>
      <h1 className="mt-4 font-heading text-2xl font-bold text-ink-900">تحرير الخدمة</h1>
      <div className="mt-6">
        <ServiceForm existing={existing} />
      </div>
    </div>
  );
}
