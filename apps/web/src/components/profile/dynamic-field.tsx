'use client';

import { localize, type LocalizedText } from '@yildirim/shared';
import { SelectField, TextField } from '@/components/ui/field';
import type { ProfileFieldDef } from '@/lib/profile';

interface Props {
  field: ProfileFieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
}

const ltrTypes = new Set(['PHONE', 'EMAIL']);

/** Renders one configurable field by type (plan module 2 — the reuse hinge). */
export function DynamicField({ field, value, onChange }: Props) {
  const label = localize(field.label) + (field.isRequired ? ' *' : '');
  const hint = field.helpText ? localize(field.helpText) : undefined;

  switch (field.type) {
    case 'TEXTAREA':
      return (
        <div>
          <label className="mb-2 block text-sm font-medium text-ink-700">{label}</label>
          <textarea
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-bone-300 bg-white px-4 py-3 text-ink-900 placeholder:text-ink-300 outline-none transition-all duration-200 focus:border-saffron-500 focus:shadow-[0_0_0_3px_rgba(245,166,35,0.15)]"
          />
          {hint && <p className="mt-1.5 text-xs text-ink-300">{hint}</p>}
        </div>
      );
    case 'SELECT':
      return (
        <SelectField
          label={label}
          hint={hint}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
        >
          <option value="">— اختر —</option>
          {(field.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {localize(o.label as LocalizedText)}
            </option>
          ))}
        </SelectField>
      );
    case 'MULTI_SELECT': {
      const selected = new Set((value as string[]) ?? []);
      return (
        <div>
          <label className="mb-2 block text-sm font-medium text-ink-700">{label}</label>
          <div className="flex flex-wrap gap-2">
            {(field.options ?? []).map((o) => {
              const on = selected.has(o.value);
              return (
                <button
                  type="button"
                  key={o.value}
                  onClick={() => {
                    const next = new Set(selected);
                    if (on) next.delete(o.value);
                    else next.add(o.value);
                    onChange(next.size ? [...next] : null);
                  }}
                  className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                    on
                      ? 'border-saffron-400 bg-saffron-100 text-saffron-700'
                      : 'border-bone-300 text-ink-500 hover:border-saffron-400'
                  }`}
                >
                  {localize(o.label as LocalizedText)}
                </button>
              );
            })}
          </div>
        </div>
      );
    }
    case 'BOOLEAN':
      return (
        <label className="flex cursor-pointer items-center gap-3 py-2">
          <input
            type="checkbox"
            checked={(value as boolean) ?? false}
            onChange={(e) => onChange(e.target.checked)}
            className="size-5 accent-saffron-500"
          />
          <span className="text-sm font-medium text-ink-700">{label}</span>
        </label>
      );
    case 'NUMBER':
      return (
        <TextField
          label={label}
          hint={hint}
          type="number"
          dir="ltr"
          className="text-end"
          min={field.validation?.min}
          max={field.validation?.max}
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        />
      );
    case 'DATE':
      return (
        <TextField
          label={label}
          hint={hint}
          type="date"
          dir="ltr"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
        />
      );
    default:
      return (
        <TextField
          label={label}
          hint={hint}
          type={field.type === 'EMAIL' ? 'email' : field.type === 'PHONE' ? 'tel' : 'text'}
          dir={ltrTypes.has(field.type) ? 'ltr' : undefined}
          className={ltrTypes.has(field.type) ? 'text-end' : ''}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
        />
      );
  }
}
