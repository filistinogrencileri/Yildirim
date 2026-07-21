'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { BrandLockup } from '@/components/brand/brand-lockup';

/** Public site header — adapts its CTAs to the current session. */
export function PublicHeader() {
  const { user, loading } = useAuth();

  const dashHref = !user ? null : user.role === 'STUDENT' ? '/dashboard' : '/portal';

  return (
    <header className="sticky top-0 z-30 border-b border-bone-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <BrandLockup size="md" hideTextOnMobile />
        <nav className="flex items-center gap-2">
          {loading ? null : dashHref ? (
            <Link
              href={dashHref}
              className="rounded-xl bg-gradient-to-l from-saffron-500 to-saffron-400 px-5 py-2 text-sm font-semibold text-ink-950 shadow-[0_8px_20px_-8px_rgba(217,140,15,0.5)] transition-shadow hover:shadow-[0_10px_28px_-8px_rgba(217,140,15,0.6)]"
            >
              {user!.role === 'STUDENT' ? 'لوحتي' : 'بوابة الإشراف'}
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-xl px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-900/5"
              >
                تسجيل الدخول
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-gradient-to-l from-saffron-500 to-saffron-400 px-5 py-2 text-sm font-semibold text-ink-950 shadow-[0_8px_20px_-8px_rgba(217,140,15,0.5)] transition-shadow hover:shadow-[0_10px_28px_-8px_rgba(217,140,15,0.6)]"
              >
                أنشئ حسابك
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
