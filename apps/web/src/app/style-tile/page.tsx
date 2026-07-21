'use client';

// لوحة الطراز — internal design reference for the Yıldırım visual language.
// v2: LIGHT theme (owner-requested pivot from the dark direction, 2026-07-20).

import { useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import {
  Bell,
  ChatCircleDots,
  CheckCircle,
  Clock,
  FileText,
  GraduationCap,
  Lightning,
  MagnifyingGlass,
  ProhibitInset,
  UploadSimple,
  WarningCircle,
  XCircle,
} from '@phosphor-icons/react';

const NAV_ITEMS = ['الرئيسية', 'الخدمات', 'طلباتي', 'ملفي'] as const;

const card = 'rounded-2xl border border-bone-200 bg-white shadow-[0_8px_32px_-24px_rgba(31,42,92,0.25)]';

function SparkNav() {
  const [active, setActive] = useState(0);
  return (
    <nav className="flex items-center gap-1 rounded-full border border-bone-200 bg-white p-1.5 shadow-[0_4px_16px_-12px_rgba(31,42,92,0.3)]">
      {NAV_ITEMS.map((item, i) => (
        <button
          key={item}
          onClick={() => setActive(i)}
          className="relative rounded-full px-4 py-1.5 text-sm text-ink-500 transition-colors duration-200 hover:text-ink-900"
        >
          {active === i && (
            <motion.span
              layoutId="spark"
              className="absolute inset-0 rounded-full bg-saffron-500/15 shadow-[inset_0_0_0_1px_rgba(217,140,15,0.4)]"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
          <span className={`relative ${active === i ? 'font-medium text-saffron-700' : ''}`}>{item}</span>
        </button>
      ))}
    </nav>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-20">
      <div className="mb-8 flex items-baseline gap-4">
        <span className="font-heading text-sm text-saffron-600">{n}</span>
        <h2 className="text-2xl font-semibold text-ink-900">{title}</h2>
        <span className="h-px flex-1 bg-gradient-to-l from-saffron-500/50 to-transparent" />
      </div>
      {children}
    </section>
  );
}

const PALETTE = [
  { name: 'عاج — Bone', hex: '#FDFCF8', cls: 'bg-bone-50 border-b border-bone-200' },
  { name: 'أبيض — Card', hex: '#FFFFFF', cls: 'bg-white border-b border-bone-200' },
  { name: 'كحلي — Ink', hex: '#1F2A5C', cls: 'bg-ink-900' },
  { name: 'برق — Saffron', hex: '#F5A623', cls: 'bg-saffron-500' },
  { name: 'فيروز — Turquoise', hex: '#2AA7A0', cls: 'bg-turquoise-500' },
  { name: 'إنذار — Error', hex: '#E5484D', cls: 'bg-error-500' },
];

const STATUS_CHIPS: Array<{ label: string; icon: React.ReactNode; cls: string; pulse?: boolean }> = [
  { label: 'مسودة', icon: <FileText size={15} />, cls: 'border-ink-100 text-ink-500' },
  { label: 'بانتظار المراجعة', icon: <Clock size={15} />, cls: 'border-ink-100 bg-ink-900/5 text-ink-700' },
  { label: 'قيد المراجعة', icon: <MagnifyingGlass size={15} />, cls: 'border-saffron-300 bg-saffron-50 text-saffron-700' },
  { label: 'بحاجة لاستكمال', icon: <WarningCircle size={15} />, cls: 'border-error-300 bg-error-50 text-error-700' },
  { label: 'قيد التنفيذ', icon: <Lightning size={15} weight="fill" />, cls: 'border-saffron-400 bg-saffron-100 text-saffron-700', pulse: true },
  { label: 'مكتمل', icon: <CheckCircle size={15} weight="fill" />, cls: 'border-turquoise-300 bg-turquoise-50 text-turquoise-700' },
  { label: 'ملغى', icon: <XCircle size={15} />, cls: 'border-ink-100 text-ink-300' },
];

function CompletionRing({ value }: { value: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduced = useReducedMotion();
  const r = 52;
  const c = 2 * Math.PI * r;
  const target = c * (1 - value / 100);
  return (
    <svg ref={ref} viewBox="0 0 120 120" className="size-28 -rotate-90">
      <defs>
        <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F5A623" />
          <stop offset="100%" stopColor="#FFC94D" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(31,42,92,0.08)" strokeWidth="9" />
      <motion.circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke="url(#ringGrad)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: reduced ? target : c }}
        animate={{ strokeDashoffset: inView ? target : c }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  );
}

const TIMELINE = [
  { label: 'تم التقديم', state: 'done' },
  { label: 'قيد المراجعة', state: 'done' },
  { label: 'قيد التنفيذ', state: 'active' },
  { label: 'النتيجة', state: 'pending' },
] as const;

export default function StyleTilePage() {
  const reduced = useReducedMotion();
  return (
    <main className="relative mx-auto max-w-6xl px-6 pb-32 pt-10">
      {/* ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px]"
        style={{
          background:
            'radial-gradient(600px 300px at 70% 0%, rgba(245,166,35,0.13), transparent 70%)',
        }}
      />

      {/* header */}
      <header className="flex flex-wrap items-center justify-between gap-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-full.png" alt="يلدرم للخدمات التعليمية" className="h-12 w-auto" />
        <SparkNav />
      </header>

      <div className="mt-16 flex flex-wrap items-center justify-between gap-8">
        <div>
          <p className="text-sm text-saffron-600">لوحة الطراز · النسخة الفاتحة</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-bold leading-[1.25] text-ink-900 sm:text-5xl sm:leading-[1.2]">
            هوية فاتحة تفتح النفس: دفءٌ عاجي، وبرقٌ ذهبي
          </h1>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-mark.png" alt="شعار يلدرم" className="size-36 object-contain sm:size-44" />
      </div>

      {/* 01 palette */}
      <Section n="٠١" title="الألوان">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {PALETTE.map((c) => (
            <motion.div
              key={c.hex}
              whileHover={reduced ? undefined : { y: -4 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className={`overflow-hidden ${card}`}
            >
              <div className={`h-20 ${c.cls}`} />
              <div className="p-3">
                <div className="text-sm text-ink-900">{c.name}</div>
                <div dir="ltr" className="mt-0.5 text-end font-mono text-xs text-ink-300">{c.hex}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* 02 type */}
      <Section n="٠٢" title="الخطوط">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className={`${card} p-8`}>
            <p className="text-xs text-ink-300">Alexandria — العناوين</p>
            <p className="font-heading mt-4 text-4xl font-bold text-ink-900">طريقك إلى الجامعة</p>
            <p className="font-heading mt-2 text-2xl font-semibold text-ink-700">مفاضلة الجامعات الحكومية</p>
          </div>
          <div className={`${card} p-8`}>
            <p className="text-xs text-ink-300">IBM Plex Sans Arabic — النصوص</p>
            <p className="mt-4 leading-8 text-ink-700">
              تابع طلبك خطوةً بخطوة: من رفع المستندات، إلى مراجعة المشرف، وحتى وصول قبولك الجامعي —
              كل شيء في مكانٍ واحد وبإشعاراتٍ فورية.
            </p>
            <p className="mt-3 text-sm leading-6 text-ink-500">
              نص ثانوي للتوضيحات والملاحظات الدقيقة · ١٢٣٤٥٦٧٨٩٠
            </p>
          </div>
        </div>
      </Section>

      {/* 03 controls */}
      <Section n="٠٣" title="الأزرار وحقول الإدخال">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className={`flex flex-wrap items-center gap-4 ${card} p-8`}>
            <motion.button
              whileHover={reduced ? undefined : { y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="rounded-xl bg-gradient-to-l from-saffron-500 to-saffron-400 px-6 py-3 font-semibold text-ink-950 shadow-[0_8px_20px_-8px_rgba(217,140,15,0.5)] transition-shadow hover:shadow-[0_10px_28px_-8px_rgba(217,140,15,0.6)]"
            >
              قدّم طلبك الآن
            </motion.button>
            <button className="rounded-xl border border-ink-900/15 bg-white px-6 py-3 font-medium text-ink-900 transition-colors duration-200 hover:border-saffron-600/60 hover:text-saffron-700">
              تصفح الخدمات
            </button>
            <button className="rounded-xl px-4 py-3 text-ink-500 transition-colors duration-200 hover:bg-ink-900/5 hover:text-ink-900">
              إلغاء
            </button>
          </div>
          <div className={`${card} p-8`}>
            <label className="mb-2 block text-sm font-medium text-ink-700">البريد الإلكتروني</label>
            <input
              dir="ltr"
              placeholder="you@example.com"
              className="w-full rounded-xl border border-bone-300 bg-white px-4 py-3 text-end text-ink-900 placeholder:text-ink-300 outline-none transition-all duration-200 focus:border-saffron-500 focus:shadow-[0_0_0_3px_rgba(245,166,35,0.15)]"
            />
            <label className="mb-2 mt-5 block text-sm font-medium text-ink-700">المستند (PDF)</label>
            <button className="flex w-full items-center justify-center gap-3 rounded-xl border border-dashed border-bone-300 bg-bone-50 px-4 py-5 text-ink-500 transition-colors duration-200 hover:border-saffron-500/60 hover:text-saffron-700">
              <UploadSimple size={20} />
              اسحب الملف أو اضغط للاختيار
            </button>
          </div>
        </div>
      </Section>

      {/* 04 status chips */}
      <Section n="٠٤" title="حالات الطلب">
        <div className="flex flex-wrap gap-3">
          {STATUS_CHIPS.map((s) => (
            <span
              key={s.label}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm ${s.cls}`}
            >
              {s.pulse && !reduced ? (
                <motion.span
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                  className="flex"
                >
                  {s.icon}
                </motion.span>
              ) : (
                s.icon
              )}
              {s.label}
            </span>
          ))}
        </div>
      </Section>

      {/* 05 icons */}
      <Section n="٠٥" title="الأيقونات — Phosphor Duotone">
        <div className="flex flex-wrap gap-4">
          {[GraduationCap, FileText, Lightning, Bell, ChatCircleDots, CheckCircle, MagnifyingGlass, ProhibitInset].map(
            (Icon, i) => (
              <motion.span
                key={i}
                whileHover={reduced ? undefined : { y: -3 }}
                className={`grid size-14 place-items-center ${card} text-saffron-600`}
              >
                <Icon size={26} weight="duotone" />
              </motion.span>
            ),
          )}
        </div>
      </Section>

      {/* 06 composed slice */}
      <Section n="٠٦" title="مقطع مركّب — لوحة الطالب">
        <div className="grid gap-6 lg:grid-cols-5">
          {/* completion card */}
          <div className={`flex items-center gap-6 ${card} p-7 lg:col-span-2`}>
            <div className="relative">
              <CompletionRing value={68} />
              <div className="absolute inset-0 grid place-items-center">
                <span className="font-heading text-2xl font-bold text-ink-900">٦٨٪</span>
              </div>
            </div>
            <div>
              <h3 className="font-heading text-lg font-semibold text-ink-900">اكتمال ملفك</h3>
              <p className="mt-1 text-sm leading-6 text-ink-500">
                بقي قسم «المستندات» لتتمكن من التقديم على المفاضلة.
              </p>
              <button className="mt-3 text-sm font-medium text-saffron-600 transition-colors hover:text-saffron-700">
                أكمل الآن ←
              </button>
            </div>
          </div>

          {/* request card */}
          <div className={`${card} p-7 lg:col-span-3`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p dir="ltr" className="text-end text-xs text-ink-300">YLD-2026-000123</p>
                <h3 className="font-heading mt-1 text-lg font-semibold text-ink-900">مفاضلة الجامعات الحكومية</h3>
                <p className="mt-1 text-sm text-ink-500">
                  مسجّل في <span className="font-medium text-ink-900">جامعة إسطنبول – الطب البشري</span>
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-saffron-400 bg-saffron-100 px-3.5 py-1.5 text-sm text-saffron-700">
                {reduced ? (
                  <Lightning size={15} weight="fill" />
                ) : (
                  <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.8, repeat: Infinity }} className="flex">
                    <Lightning size={15} weight="fill" />
                  </motion.span>
                )}
                قيد التنفيذ
              </span>
            </div>

            {/* timeline */}
            <div className="mt-7 flex items-center">
              {TIMELINE.map((step, i) => (
                <div key={step.label} className={`flex items-center ${i > 0 ? 'flex-1' : ''}`}>
                  {i > 0 && (
                    <span
                      className={`h-px flex-1 ${step.state === 'pending' ? 'bg-ink-100' : 'bg-gradient-to-l from-saffron-500/80 to-saffron-500/30'}`}
                    />
                  )}
                  <div className="flex flex-col items-center gap-2 px-1">
                    <span
                      className={`grid size-3.5 place-items-center rounded-full ${
                        step.state === 'done'
                          ? 'bg-saffron-500'
                          : step.state === 'active'
                            ? 'bg-saffron-400 shadow-[0_0_12px_rgba(245,166,35,0.7)]'
                            : 'border border-ink-100 bg-white'
                      }`}
                    />
                    <span
                      className={`text-[11px] ${step.state === 'pending' ? 'text-ink-300' : 'text-ink-700'}`}
                    >
                      {step.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-bone-200 pt-5">
              <span className="text-xs text-ink-300">آخر تحديث: منذ يومين</span>
              <button className="inline-flex items-center gap-2 rounded-xl border border-ink-900/15 bg-white px-4 py-2 text-sm text-ink-900 transition-colors duration-200 hover:border-turquoise-500/60 hover:text-turquoise-700">
                <ChatCircleDots size={17} />
                تواصل مع المشرف
              </button>
            </div>
          </div>
        </div>
      </Section>

      <footer className="mt-24 border-t border-bone-200 pt-6 text-xs leading-6 text-ink-300">
        لغة الحركة: انتقالات ١٥٠–٢٥٠ م.ث بمنحنى ease-out · نبض خفيف للحالات النشطة · انزلاق اتجاهي
        يحترم RTL · تُعطَّل الحركة تلقائيًا مع prefers-reduced-motion.
      </footer>
    </main>
  );
}
