import Link from 'next/link';
import { PublicHeader } from '@/components/public/public-header';
import { SiteFooter } from '@/components/public/site-footer';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

interface ServiceCard {
  slug: string;
  title: { ar: string };
  description: { ar: string };
  type: string;
  choiceMode: string;
  maxChoices: number;
  deadlineAt: string | null;
}

async function getServices(): Promise<ServiceCard[]> {
  try {
    const res = await fetch(`${API_URL}/catalog/services`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return (await res.json()) as ServiceCard[];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const services = await getServices();

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />

      <div className="flex-1">
      {/* hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px]"
          style={{
            background:
              'radial-gradient(700px 340px at 50% 0%, rgba(245,166,35,0.14), transparent 70%)',
          }}
        />
        <div className="mx-auto flex max-w-6xl flex-col items-center px-4 pb-20 pt-16 text-center sm:pt-24">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-mark.png" alt="" className="size-28 object-contain sm:size-36" />
          <h1 className="mt-6 max-w-3xl font-heading text-4xl font-bold leading-[1.25] text-ink-900 sm:text-6xl sm:leading-[1.2]">
            طريقك إلى الجامعات التركية
            <span className="text-saffron-600"> يبدأ من هنا</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-ink-500">
            مفاضلات جامعية، ملف واحد لكل مستنداتك، ومتابعة لحظية لطلبك من التقديم وحتى وصول
            قبولك الجامعي.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/register"
              className="rounded-xl bg-gradient-to-l from-saffron-500 to-saffron-400 px-8 py-3.5 font-semibold text-ink-950 shadow-[0_8px_20px_-8px_rgba(217,140,15,0.5)] transition-shadow hover:shadow-[0_12px_32px_-8px_rgba(217,140,15,0.6)]"
            >
              ابدأ رحلتك الآن
            </Link>
            <a
              href="#services"
              className="rounded-xl border border-ink-900/15 bg-white px-8 py-3.5 font-medium text-ink-900 transition-colors hover:border-saffron-600/60 hover:text-saffron-700"
            >
              تصفح الخدمات
            </a>
          </div>
        </div>
      </section>

      {/* services */}
      <section id="services" className="mx-auto max-w-6xl px-4 pb-24">
        <div className="mb-8 flex items-baseline gap-4">
          <h2 className="font-heading text-2xl font-semibold text-ink-900">الخدمات المتاحة</h2>
          <span className="h-px flex-1 bg-gradient-to-l from-saffron-500/50 to-transparent" />
        </div>

        {services.length === 0 ? (
          <p className="rounded-2xl border border-bone-200 bg-white p-10 text-center text-ink-500">
            لا توجد خدمات متاحة حاليًا — تابعنا قريبًا.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <Link
                key={s.slug}
                href={`/services/${s.slug}`}
                className="group rounded-2xl border border-bone-200 bg-white p-7 shadow-[0_8px_32px_-24px_rgba(31,42,92,0.25)] transition-all hover:-translate-y-1 hover:shadow-[0_16px_40px_-20px_rgba(31,42,92,0.3)]"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-saffron-300 bg-saffron-50 px-3 py-1 text-xs text-saffron-700">
                    {s.type === 'UNIVERSITY_PLACEMENT' ? 'مفاضلة جامعية' : 'خدمة تعليمية'}
                  </span>
                  {s.type === 'UNIVERSITY_PLACEMENT' && s.choiceMode === 'MULTI' && (
                    <span className="rounded-full border border-ink-100 px-3 py-1 text-xs text-ink-500">
                      حتى {s.maxChoices} رغبات
                    </span>
                  )}
                </div>
                <h3 className="mt-4 font-heading text-lg font-semibold text-ink-900 transition-colors group-hover:text-saffron-700">
                  {s.title.ar}
                </h3>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-ink-500">{s.description.ar}</p>
                <span className="mt-5 inline-block text-sm font-medium text-saffron-600">
                  التفاصيل والتقديم ←
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
      </div>

      <SiteFooter />
    </div>
  );
}
