'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { localize, type ChoiceMode, type ServiceType } from '@yildirim/shared';
import { Button } from '@/components/ui/button';
import { SelectField, TextField } from '@/components/ui/field';
import {
  useCreateService,
  useFieldCatalog,
  useSetRequirements,
  useUpdateService,
  type AdminService,
} from '@/lib/staff';

const card = 'rounded-2xl border border-bone-200 bg-white shadow-[0_8px_32px_-24px_rgba(31,42,92,0.25)]';

interface Props {
  existing?: AdminService;
}

/**
 * Create/edit a service. Requirements are picked from the SAME master field
 * catalog used by student profiles — a service never defines its own fields,
 * and applicants' data always comes from their profile.
 */
export function ServiceForm({ existing }: Props) {
  const router = useRouter();
  const { data: catalog } = useFieldCatalog();
  const create = useCreateService();
  const update = useUpdateService(existing?.id ?? '');
  const setRequirements = useSetRequirements(existing?.id ?? '');

  const [slug, setSlug] = useState(existing?.slug ?? '');
  const [titleAr, setTitleAr] = useState(existing ? localize(existing.title) : '');
  const [descriptionAr, setDescriptionAr] = useState(existing ? localize(existing.description) : '');
  const [type, setType] = useState<ServiceType>(existing?.type ?? 'UNIVERSITY_PLACEMENT');
  const [choiceMode, setChoiceMode] = useState<ChoiceMode>(existing?.choiceMode ?? 'MULTI');
  const [maxChoices, setMaxChoices] = useState(existing?.maxChoices ?? 3);
  const [deadlineAt, setDeadlineAt] = useState(existing?.deadlineAt?.slice(0, 10) ?? '');
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set((existing?.requirements ?? []).map((r) => r.fieldId)),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const toggle = (fieldId: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(fieldId)) next.delete(fieldId);
      else next.add(fieldId);
      return next;
    });

  const onSubmit = async () => {
    setError(null);
    if (!slug || !titleAr.trim() || !descriptionAr.trim()) {
      setError('المعرّف والعنوان والوصف حقول إلزامية.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        slug,
        title: { ar: titleAr.trim() },
        description: { ar: descriptionAr.trim() },
        type,
        choiceMode: type === 'UNIVERSITY_PLACEMENT' ? choiceMode : ('SINGLE' as ChoiceMode),
        maxChoices,
        deadlineAt: deadlineAt || undefined,
      };
      let serviceId = existing?.id;
      if (existing) {
        await update.mutateAsync(payload);
      } else {
        const created = await create.mutateAsync(payload);
        serviceId = created.id;
      }
      const requirements = [...checked].map((fieldId) => ({ fieldId, isRequired: true }));
      await fetchRequirements(serviceId!, requirements);
      router.push('/portal/services');
    } catch {
      setError('تعذّر الحفظ — تأكد أن المعرّف بصيغة لاتينية-صغيرة وغير مستخدم.');
    } finally {
      setSaving(false);
    }
  };

  // requirements need the (possibly just-created) service id — call directly
  const fetchRequirements = async (
    serviceId: string,
    requirements: Array<{ fieldId: string; isRequired: boolean }>,
  ) => {
    const { api } = await import('@/lib/auth');
    await api(`/admin/services/${serviceId}/requirements`, {
      method: 'PUT',
      body: JSON.stringify({ requirements }),
    });
  };

  return (
    <div className="space-y-6">
      <div className={`${card} p-6 sm:p-8`}>
        <h2 className="text-sm font-semibold text-ink-700">بيانات الخدمة</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <TextField
            label="العنوان (بالعربية)"
            value={titleAr}
            onChange={(e) => setTitleAr(e.target.value)}
          />
          <TextField
            label="المعرّف في الرابط (لاتيني)"
            dir="ltr"
            className="text-end font-mono"
            placeholder="private-university-scholarship"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            hint="أحرف إنجليزية صغيرة وأرقام وشرطات فقط"
          />
          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-medium text-ink-700">الوصف</label>
            <textarea
              value={descriptionAr}
              onChange={(e) => setDescriptionAr(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-bone-300 bg-white px-4 py-3 text-ink-900 outline-none transition-all focus:border-saffron-500 focus:shadow-[0_0_0_3px_rgba(245,166,35,0.15)]"
            />
          </div>
          <SelectField label="نوع الخدمة" value={type} onChange={(e) => setType(e.target.value as ServiceType)}>
            <option value="UNIVERSITY_PLACEMENT">مفاضلة جامعية</option>
            <option value="GENERAL">خدمة عامة</option>
          </SelectField>
          {type === 'UNIVERSITY_PLACEMENT' && (
            <>
              <SelectField
                label="نمط الرغبات"
                value={choiceMode}
                onChange={(e) => setChoiceMode(e.target.value as ChoiceMode)}
              >
                <option value="SINGLE">رغبة واحدة</option>
                <option value="MULTI">رغبات مرتبة</option>
              </SelectField>
              {choiceMode === 'MULTI' && (
                <TextField
                  label="الحد الأقصى للرغبات"
                  type="number"
                  dir="ltr"
                  className="text-end"
                  min={1}
                  max={10}
                  value={String(maxChoices)}
                  onChange={(e) => setMaxChoices(Number(e.target.value) || 1)}
                />
              )}
            </>
          )}
          <TextField
            label="الموعد النهائي (اختياري)"
            type="date"
            dir="ltr"
            value={deadlineAt}
            onChange={(e) => setDeadlineAt(e.target.value)}
          />
        </div>
      </div>

      <div className={`${card} p-6 sm:p-8`}>
        <h2 className="text-sm font-semibold text-ink-700">المتطلبات من ملف الطالب</h2>
        <p className="mt-1 text-xs text-ink-300">
          تُقرأ بيانات المتقدمين دائمًا من ملفاتهم الشخصية — اختر الحقول التي يجب أن تكون مكتملة قبل التقديم.
        </p>
        <div className="mt-5 space-y-6">
          {(catalog ?? []).map((section) => (
            <div key={section.id}>
              <h3 className="font-heading text-sm font-semibold text-saffron-700">{localize(section.title)}</h3>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {section.fields.map((f) => (
                  <label
                    key={f.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 text-sm transition-colors ${
                      checked.has(f.id)
                        ? 'border-saffron-400 bg-saffron-50 text-ink-900'
                        : 'border-bone-200 text-ink-500 hover:border-saffron-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked.has(f.id)}
                      onChange={() => toggle(f.id)}
                      className="size-4 accent-saffron-500"
                    />
                    {localize(f.label)}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-error-300 bg-error-50 px-4 py-3 text-sm text-error-700">{error}</p>
      )}
      <div className="flex gap-3">
        <Button loading={saving} onClick={() => void onSubmit()}>
          {existing ? 'حفظ التعديلات' : 'إنشاء الخدمة'}
        </Button>
        <Button variant="ghost" onClick={() => router.back()}>
          إلغاء
        </Button>
      </div>
    </div>
  );
}
