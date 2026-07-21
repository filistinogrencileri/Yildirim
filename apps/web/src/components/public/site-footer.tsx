'use client';

import { useState } from 'react';
import {
  CheckCircle,
  EnvelopeSimple,
  FacebookLogo,
  InstagramLogo,
  MapPin,
  PaperPlaneRight,
  Phone,
  TelegramLogo,
  TiktokLogo,
  TwitterLogo,
  WhatsappLogo,
  YoutubeLogo,
} from '@phosphor-icons/react';
import type { LegalType, SiteSocial } from '@yildirim/shared';
import { useSiteConfig, useSubscribe } from '@/lib/site';
import { BrandLockup } from '@/components/brand/brand-lockup';
import { LegalModal } from './legal-modal';

const SOCIAL: Array<{ key: keyof SiteSocial; Icon: React.ElementType; label: string }> = [
  { key: 'facebook', Icon: FacebookLogo, label: 'فيسبوك' },
  { key: 'instagram', Icon: InstagramLogo, label: 'إنستغرام' },
  { key: 'youtube', Icon: YoutubeLogo, label: 'يوتيوب' },
  { key: 'tiktok', Icon: TiktokLogo, label: 'تيك توك' },
  { key: 'twitter', Icon: TwitterLogo, label: 'إكس' },
  { key: 'telegram', Icon: TelegramLogo, label: 'تيليغرام' },
];

export function SiteFooter() {
  const { data: config } = useSiteConfig();
  const subscribe = useSubscribe();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [legal, setLegal] = useState<LegalType | null>(null);

  const onSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      await subscribe.mutateAsync(email.trim());
      setSubscribed(true);
      setEmail('');
    } catch {
      /* keep silent — footer isn't a place for loud errors */
    }
  };

  const socials = SOCIAL.filter((s) => config?.social?.[s.key]);
  const copyright = config?.copyright?.text || 'جميع الحقوق محفوظة © يلدريم للخدمات التعليمية';
  const copyrightUrl = config?.copyright?.url;

  return (
    <footer className="mt-auto border-t border-bone-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1.2fr]">
          {/* brand + contact */}
          <div>
            <BrandLockup size="md" href="/" />
            <p className="mt-4 max-w-sm text-sm leading-7 text-ink-500">
              منصة يلدريم للخدمات التعليمية — طريقك إلى الجامعات التركية: مفاضلات، متابعة طلبات،
              وخزنة مستندات في مكان واحد.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-ink-600">
              {config?.contact?.phone && (
                <li className="flex items-center gap-2">
                  <Phone size={17} className="text-saffron-600" />
                  <a href={`tel:${config.contact.phone}`} dir="ltr" className="hover:text-ink-900">
                    {config.contact.phone}
                  </a>
                </li>
              )}
              {config?.contact?.email && (
                <li className="flex items-center gap-2">
                  <EnvelopeSimple size={17} className="text-saffron-600" />
                  <a href={`mailto:${config.contact.email}`} dir="ltr" className="hover:text-ink-900">
                    {config.contact.email}
                  </a>
                </li>
              )}
              {config?.contact?.whatsapp && (
                <li className="flex items-center gap-2">
                  <WhatsappLogo size={17} className="text-saffron-600" />
                  <a
                    href={`https://wa.me/${config.contact.whatsapp.replace(/[^\d]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    dir="ltr"
                    className="hover:text-ink-900"
                  >
                    {config.contact.whatsapp}
                  </a>
                </li>
              )}
              {config?.contact?.address && (
                <li className="flex items-center gap-2">
                  <MapPin size={17} className="text-saffron-600" />
                  {config.contact.address}
                </li>
              )}
            </ul>
          </div>

          {/* quick links */}
          <div>
            <h3 className="font-heading text-sm font-bold text-ink-900">روابط سريعة</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-ink-500">
              <li>
                <a href="/#services" className="hover:text-saffron-700">
                  الخدمات المتاحة
                </a>
              </li>
              <li>
                <a href="/register" className="hover:text-saffron-700">
                  إنشاء حساب
                </a>
              </li>
              <li>
                <a href="/login" className="hover:text-saffron-700">
                  تسجيل الدخول
                </a>
              </li>
              <li>
                <button onClick={() => setLegal('privacy')} className="hover:text-saffron-700">
                  {config?.legal?.privacy?.title || 'سياسة الخصوصية'}
                </button>
              </li>
              <li>
                <button onClick={() => setLegal('terms')} className="hover:text-saffron-700">
                  {config?.legal?.terms?.title || 'الشروط والأحكام'}
                </button>
              </li>
            </ul>
          </div>

          {/* newsletter + social */}
          <div>
            {config?.newsletterEnabled !== false && (
              <>
                <h3 className="font-heading text-sm font-bold text-ink-900">النشرة البريدية</h3>
                <p className="mt-2 text-sm text-ink-500">اشترك ليصلك جديد الخدمات والمفاضلات.</p>
                {subscribed ? (
                  <div className="mt-4 flex items-center gap-2 rounded-xl border border-turquoise-300 bg-turquoise-50 px-4 py-3 text-sm text-turquoise-700">
                    <CheckCircle size={18} weight="fill" />
                    تم اشتراكك، شكراً لك!
                  </div>
                ) : (
                  <form onSubmit={onSubscribe} className="mt-4 flex gap-2">
                    <input
                      type="email"
                      required
                      dir="ltr"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="بريدك الإلكتروني"
                      className="min-w-0 flex-1 rounded-xl border border-bone-300 bg-white px-4 py-2.5 text-end text-sm text-ink-900 placeholder:text-ink-300 outline-none transition-all focus:border-saffron-500 focus:shadow-[0_0_0_3px_rgba(245,166,35,0.15)]"
                    />
                    <button
                      type="submit"
                      disabled={subscribe.isPending}
                      className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-l from-saffron-500 to-saffron-400 text-ink-950 shadow-[0_8px_20px_-8px_rgba(217,140,15,0.5)] disabled:opacity-60"
                      aria-label="اشترك"
                    >
                      {subscribe.isPending ? (
                        <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <PaperPlaneRight size={18} weight="fill" className="-scale-x-100" />
                      )}
                    </button>
                  </form>
                )}
              </>
            )}

            {socials.length > 0 && (
              <div className="mt-6">
                <h3 className="font-heading text-sm font-bold text-ink-900">تابعنا</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {socials.map(({ key, Icon, label }) => (
                    <a
                      key={key}
                      href={config!.social[key]}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={label}
                      className="grid size-10 place-items-center rounded-xl border border-bone-200 bg-bone-50 text-ink-600 transition-colors hover:border-saffron-400 hover:bg-saffron-50 hover:text-saffron-700"
                    >
                      <Icon size={20} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* copyright bar */}
      <div className="border-t border-bone-200 bg-bone-50">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs text-ink-400">
          {copyrightUrl ? (
            <a href={copyrightUrl} target="_blank" rel="noreferrer" className="hover:text-saffron-700">
              {copyright}
            </a>
          ) : (
            <span>{copyright}</span>
          )}
          <div className="flex gap-4">
            <button onClick={() => setLegal('privacy')} className="hover:text-saffron-700">
              {config?.legal?.privacy?.title || 'سياسة الخصوصية'}
            </button>
            <button onClick={() => setLegal('terms')} className="hover:text-saffron-700">
              {config?.legal?.terms?.title || 'الشروط والأحكام'}
            </button>
          </div>
        </div>
      </div>

      <LegalModal type={legal} onClose={() => setLegal(null)} />
    </footer>
  );
}
