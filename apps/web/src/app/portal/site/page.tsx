'use client';

import { useEffect, useState } from 'react';
import type { SiteContact, SiteCopyright, SiteSocial } from '@yildirim/shared';
import { useAuth } from '@/lib/auth';
import { useAdminSiteSettings, useSaveSiteSettings } from '@/lib/site';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';
import { LegalEditor } from '@/components/portal/legal-editor';

const card = 'rounded-2xl border border-bone-200 bg-white p-6 shadow-[0_8px_32px_-24px_rgba(31,42,92,0.25)] sm:p-8';

const SOCIAL_LABELS: Record<keyof SiteSocial, string> = {
  facebook: 'فيسبوك',
  instagram: 'إنستغرام',
  youtube: 'يوتيوب',
  tiktok: 'تيك توك',
  twitter: 'إكس (تويتر)',
  telegram: 'تيليغرام',
};

export default function AdminSitePage() {
  const { user } = useAuth();
  const { data, isLoading } = useAdminSiteSettings();
  const save = useSaveSiteSettings();

  const [contact, setContact] = useState<SiteContact>({ phone: '', email: '', whatsapp: '', address: '' });
  const [social, setSocial] = useState<SiteSocial>({
    facebook: '', instagram: '', tiktok: '', youtube: '', twitter: '', telegram: '',
  });
  const [newsletterEnabled, setNewsletterEnabled] = useState(true);
  const [copyright, setCopyright] = useState<SiteCopyright>({ text: '', url: '' });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) {
      setContact(data.contact);
      setSocial(data.social);
      setNewsletterEnabled(data.newsletterEnabled);
      setCopyright(data.copyright);
    }
  }, [data]);

  if (user?.role !== 'ADMIN') return <p className="text-center text-ink-500">هذه الصفحة للمدير فقط.</p>;
  if (isLoading || !data) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <span className="size-8 animate-spin rounded-full border-2 border-saffron-500 border-t-transparent" />
      </div>
    );
  }

  const onSave = async () => {
    setSaved(false);
    await save.mutateAsync({ contact, social, newsletterEnabled, copyright });
    setSaved(true);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-ink-900">إعدادات الموقع</h1>
        <p className="mt-2 text-ink-500">بيانات التواصل، روابط التواصل الاجتماعي، والصفحات القانونية التي تظهر في التذييل.</p>
      </div>

      {/* contact */}
      <div className={card}>
        <h2 className="text-sm font-semibold text-ink-700">بيانات التواصل</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <TextField label="رقم الهاتف" dir="ltr" className="text-end" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
          <TextField label="واتساب" dir="ltr" className="text-end" value={contact.whatsapp} onChange={(e) => setContact({ ...contact, whatsapp: e.target.value })} />
          <TextField label="البريد الإلكتروني" dir="ltr" className="text-end" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
          <TextField label="العنوان" value={contact.address} onChange={(e) => setContact({ ...contact, address: e.target.value })} />
        </div>
      </div>

      {/* social */}
      <div className={card}>
        <h2 className="text-sm font-semibold text-ink-700">روابط التواصل الاجتماعي</h2>
        <p className="mt-1 text-xs text-ink-300">اترك الحقل فارغاً لإخفاء الأيقونة من التذييل.</p>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          {(Object.keys(SOCIAL_LABELS) as Array<keyof SiteSocial>).map((k) => (
            <TextField
              key={k}
              label={SOCIAL_LABELS[k]}
              dir="ltr"
              className="text-end"
              placeholder="https://…"
              value={social[k]}
              onChange={(e) => setSocial({ ...social, [k]: e.target.value })}
            />
          ))}
        </div>
      </div>

      {/* newsletter + copyright */}
      <div className={card}>
        <h2 className="text-sm font-semibold text-ink-700">النشرة والحقوق</h2>
        <label className="mt-4 flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={newsletterEnabled}
            onChange={(e) => setNewsletterEnabled(e.target.checked)}
            className="size-5 accent-saffron-500"
          />
          <span className="text-sm text-ink-900">تفعيل الاشتراك في النشرة البريدية</span>
        </label>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <TextField label="نص حقوق النشر" value={copyright.text} onChange={(e) => setCopyright({ ...copyright, text: e.target.value })} />
          <TextField label="رابط حقوق النشر (اختياري)" dir="ltr" className="text-end" placeholder="https://…" value={copyright.url} onChange={(e) => setCopyright({ ...copyright, url: e.target.value })} hint="عند الضغط على نص الحقوق ينتقل الزائر لهذا الرابط" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button loading={save.isPending} onClick={() => void onSave()}>
          حفظ الإعدادات
        </Button>
        {saved && <span className="text-sm text-turquoise-700">تم الحفظ ✓</span>}
      </div>

      {/* legal documents */}
      <div className={card}>
        <h2 className="font-heading text-lg font-semibold text-ink-900">سياسة الخصوصية</h2>
        <p className="mt-1 mb-4 text-xs text-ink-300">تظهر كنص في نافذة منبثقة، مع زر لعرض ملف PDF إن رُفع.</p>
        <LegalEditor type="privacy" initial={data.legal.privacy} />
      </div>
      <div className={card}>
        <h2 className="font-heading text-lg font-semibold text-ink-900">الشروط والأحكام</h2>
        <p className="mt-1 mb-4 text-xs text-ink-300">تظهر كنص في نافذة منبثقة، مع زر لعرض ملف PDF إن رُفع.</p>
        <LegalEditor type="terms" initial={data.legal.terms} />
      </div>
    </div>
  );
}
