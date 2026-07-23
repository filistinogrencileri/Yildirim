'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { SignOut } from '@phosphor-icons/react';
import { useAuth } from '@/lib/auth';
import { BrandLockup } from '@/components/brand/brand-lockup';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && (!user || user.role === 'STUDENT')) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user || user.role === 'STUDENT') {
    return (
      <main className="grid min-h-screen place-items-center">
        <span className="size-8 animate-spin rounded-full border-2 border-saffron-500 border-t-transparent" />
      </main>
    );
  }

  const nav = [
    { href: '/portal', label: 'الطلبات', exact: true },
    ...(user.role === 'ADMIN'
      ? [
          { href: '/portal/services', label: 'الخدمات', exact: false },
          { href: '/portal/supervisors', label: 'المشرفون', exact: false },
          { href: '/portal/lists', label: 'القوائم', exact: false },
          { href: '/portal/site', label: 'الموقع', exact: false },
        ]
      : []),
    { href: '/portal/settings', label: 'الإعدادات', exact: false },
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-bone-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4">
            <BrandLockup size="md" href="/portal" hideTextOnMobile />
            <span className="hidden h-8 w-px bg-bone-200 lg:block" />
            <div className="hidden leading-tight lg:block">
              <p className="font-heading text-sm font-bold text-ink-900">بوابة الإشراف</p>
              <p className="text-xs text-ink-300">{user.role === 'ADMIN' ? 'مدير' : 'مشرف'} · {user.fullNameAr}</p>
            </div>
          </div>

          <nav className="flex items-center gap-1 rounded-full border border-bone-200 bg-bone-100 p-1">
            {nav.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative rounded-full px-4 py-1.5 text-sm text-ink-500 transition-colors hover:text-ink-900"
                >
                  {active && (
                    <motion.span
                      layoutId="portal-nav"
                      className="absolute inset-0 rounded-full bg-saffron-500/15 shadow-[inset_0_0_0_1px_rgba(217,140,15,0.4)]"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className={`relative ${active ? 'font-medium text-saffron-700' : ''}`}>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <button
            onClick={() => void signOut().then(() => router.replace('/login'))}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-ink-500 transition-colors hover:bg-ink-900/5 hover:text-ink-900"
          >
            <SignOut size={17} />
            <span className="max-sm:hidden">خروج</span>
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
