'use client';

import Link from 'next/link';
import { Plus } from '@phosphor-icons/react';
import { useAuth } from '@/lib/auth';

/** Admin-only shortcut on the public services listing (requirement 1). */
export function AdminAddServiceCard() {
  const { user } = useAuth();
  if (user?.role !== 'ADMIN') return null;
  return (
    <Link
      href="/portal/services/new"
      className="grid min-h-44 place-items-center rounded-2xl border-2 border-dashed border-saffron-400/60 bg-saffron-50/50 text-saffron-700 transition-colors hover:border-saffron-500 hover:bg-saffron-50"
    >
      <span className="flex flex-col items-center gap-2 text-sm font-medium">
        <Plus size={28} weight="bold" />
        إضافة خدمة جديدة
      </span>
    </Link>
  );
}
