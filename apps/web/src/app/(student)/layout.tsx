'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { SignOut } from '@phosphor-icons/react';
import { useAuth } from '@/lib/auth';
import { BrandLockup } from '@/components/brand/brand-lockup';

const NAV = [
  { href: '/dashboard', label: 'الرئيسية' },
  { href: '/services', label: 'الخدمات' },
  { href: '/profile', label: 'ملفي' },
  { href: '/requests', label: 'طلباتي' },
] as const;

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (user.role !== 'STUDENT') router.replace('/portal');
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <main className="grid min-h-screen place-items-center">
        <span className="size-8 animate-spin rounded-full border-2 border-saffron-500 border-t-transparent" />
      </main>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-bone-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <BrandLockup size="md" href="/dashboard" hideTextOnMobile />

          <nav className="flex items-center gap-1 rounded-full border border-bone-200 bg-bone-100 p-1">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative rounded-full px-4 py-1.5 text-sm text-ink-500 transition-colors hover:text-ink-900"
                >
                  {active && (
                    <motion.span
                      layoutId="student-nav"
                      className="absolute inset-0 rounded-full bg-saffron-500/15 shadow-[inset_0_0_0_1px_rgba(245,166,35,0.35)]"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className={`relative ${active ? 'text-saffron-600' : ''}`}>{item.label}</span>
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
