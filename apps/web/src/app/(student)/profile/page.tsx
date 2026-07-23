'use client';

import { useRef, useState } from 'react';
import { Camera, CheckCircle, Circle, WarningCircle } from '@phosphor-icons/react';
import { localize } from '@yildirim/shared';
import { useAuth } from '@/lib/auth';
import { fileHref, useProfile, useUploadPhoto } from '@/lib/profile';
import { CompletionRing } from '@/components/ui/completion-ring';
import { SectionPanel } from '@/components/profile/section-panel';

const STATE_META = {
  COMPLETE: { icon: CheckCircle, cls: 'text-turquoise-600' },
  INCOMPLETE: { icon: WarningCircle, cls: 'text-saffron-600' },
  NOT_REQUIRED: { icon: Circle, cls: 'text-ink-300' },
} as const;

export default function ProfilePage() {
  const { user } = useAuth();
  const { data, isLoading } = useProfile();
  const uploadPhoto = useUploadPhoto();
  const photoInput = useRef<HTMLInputElement>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const PHOTO_ERRORS: Record<string, string> = {
    PHOTO_BACKGROUND_NOT_WHITE:
      'يجب أن تكون الصورة بيومترية بخلفية بيضاء بالكامل — أعد التصوير أمام خلفية بيضاء.',
    NOT_AN_IMAGE: 'الملف ليس صورة صالحة (JPG أو PNG).',
    FILE_TOO_LARGE: 'حجم الصورة كبير جدًا (الحد ٨ ميغابايت).',
  };

  if (isLoading || !data) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <span className="size-8 animate-spin rounded-full border-2 border-saffron-500 border-t-transparent" />
      </div>
    );
  }

  const active = data.sections.find((s) => s.key === activeKey) ?? data.sections[0];

  return (
    <div>
      {/* header card */}
      <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-bone-200 bg-white p-6 shadow-[0_8px_32px_-24px_rgba(31,42,92,0.25)] sm:p-8">
        <button
          type="button"
          onClick={() => photoInput.current?.click()}
          className="group relative"
          title="تغيير الصورة الشخصية"
        >
          {data.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fileHref(data.photo.url)}
              alt="الصورة الشخصية"
              className="size-24 rounded-full border-2 border-saffron-400 object-cover"
            />
          ) : (
            <span className="grid size-24 place-items-center rounded-full border-2 border-dashed border-saffron-400 bg-saffron-50 text-saffron-600">
              <Camera size={30} />
            </span>
          )}
          <span className="absolute -bottom-1 -end-1 grid size-8 place-items-center rounded-full bg-ink-900 text-white opacity-90 transition-transform group-hover:scale-110">
            {uploadPhoto.isPending ? (
              <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Camera size={15} />
            )}
          </span>
        </button>
        <input
          ref={photoInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setPhotoError(null);
            void uploadPhoto
              .mutateAsync(f)
              .catch((err: unknown) => {
                const code = err instanceof Error ? err.message : '';
                setPhotoError(PHOTO_ERRORS[code] ?? 'تعذّر رفع الصورة — أعد المحاولة.');
              })
              .finally(() => {
                if (photoInput.current) photoInput.current.value = '';
              });
          }}
        />

        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-2xl font-bold text-ink-900">{user?.fullNameAr}</h1>
          <p className="mt-1 text-sm text-ink-500">
            {data.completeness.percent === 100
              ? 'ملفك مكتمل — جاهز للتقديم على الخدمات.'
              : `بقي ${data.completeness.requiredTotal - data.completeness.requiredFilled} من ${data.completeness.requiredTotal} حقول مطلوبة لإكمال ملفك.`}
          </p>
          {!data.photo && !photoError && (
            <p className="mt-1 text-xs text-saffron-700">
              الصورة الشخصية مطلوبة (بيومترية بخلفية بيضاء) — اضغط على الدائرة لرفعها.
            </p>
          )}
          {photoError && (
            <p className="mt-1 rounded-lg border border-error-300 bg-error-50 px-3 py-1.5 text-xs text-error-700">
              {photoError}
            </p>
          )}
        </div>

        <div className="relative">
          <CompletionRing value={data.completeness.percent} size={88} />
          <div className="absolute inset-0 grid place-items-center">
            <span className="font-heading text-lg font-bold text-ink-900">
              {data.completeness.percent}٪
            </span>
          </div>
        </div>
      </div>

      {/* section tabs */}
      <div className="mt-8 flex flex-wrap gap-2">
        {data.sections.map((s) => {
          const Meta = STATE_META[s.state];
          const isActive = s.key === active?.key;
          return (
            <button
              key={s.key}
              onClick={() => setActiveKey(s.key)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors ${
                isActive
                  ? 'border-saffron-400 bg-saffron-100 font-medium text-saffron-700'
                  : 'border-bone-200 bg-white text-ink-500 hover:border-saffron-400/60 hover:text-ink-900'
              }`}
            >
              <Meta.icon size={16} weight={s.state === 'COMPLETE' ? 'fill' : 'regular'} className={Meta.cls} />
              {localize(s.title)}
            </button>
          );
        })}
      </div>

      {/* active section */}
      {active && (
        <div className="mt-6">
          <SectionPanel key={active.key} section={active} />
        </div>
      )}
    </div>
  );
}
