import { BrandLockup } from '@/components/brand/brand-lockup';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[380px]"
        style={{
          background:
            'radial-gradient(560px 280px at 50% 0%, rgba(245,166,35,0.12), transparent 70%)',
        }}
      />
      <BrandLockup size="lg" className="mb-8" />
      <div className="w-full max-w-md rounded-2xl border border-bone-200 bg-white p-8 shadow-[0_12px_48px_-20px_rgba(31,42,92,0.18)]">
        {children}
      </div>
    </main>
  );
}
