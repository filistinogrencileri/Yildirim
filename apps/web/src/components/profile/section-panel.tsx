'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash } from '@phosphor-icons/react';
import { localize } from '@yildirim/shared';
import { Button } from '@/components/ui/button';
import { DynamicField } from './dynamic-field';
import { FileFieldRow } from './file-field-row';
import {
  useDeleteEntry,
  useSaveValues,
  type ProfileSectionData,
  type ValueInput,
} from '@/lib/profile';

type EntryState = Record<string, unknown>; // fieldKey -> value

function entriesFromSection(section: ProfileSectionData): EntryState[] {
  return section.entries.map((e) => {
    const state: EntryState = {};
    for (const f of section.fields) state[f.key] = e.values[f.key]?.value ?? null;
    return state;
  });
}

export function SectionPanel({ section }: { section: ProfileSectionData }) {
  const [entries, setEntries] = useState<EntryState[]>(() => entriesFromSection(section));
  const [saved, setSaved] = useState(false);
  const save = useSaveValues();
  const removeEntry = useDeleteEntry();

  // resync when server data changes (saves/uploads replace the cache object)
  useEffect(() => setEntries(entriesFromSection(section)), [section]);

  const scalarFields = section.fields.filter((f) => f.type !== 'FILE_PDF' && f.type !== 'FILE_IMAGE');
  const fileFields = section.fields.filter((f) => f.type === 'FILE_PDF' || f.type === 'FILE_IMAGE');

  /** conditional display: hide a field until its showIf condition matches */
  const isVisible = (f: (typeof section.fields)[number], entry: EntryState): boolean => {
    const cond = f.validation?.showIf;
    if (!cond) return true;
    return entry[cond.field] === cond.equals;
  };

  const setValue = (entryIndex: number, fieldKey: string, value: unknown) => {
    setSaved(false);
    setEntries((prev) => prev.map((e, i) => (i === entryIndex ? { ...e, [fieldKey]: value } : e)));
  };

  const onSave = async () => {
    const values: ValueInput[] = [];
    entries.forEach((entry, entryIndex) => {
      for (const f of scalarFields) {
        // untouched checkboxes count as an explicit "no" so the field reads as
        // filled after the first save (required-BOOLEAN fields stay usable)
        const fallback = f.type === 'BOOLEAN' ? false : null;
        values.push({ fieldId: f.id, entryIndex, value: entry[f.key] ?? fallback });
      }
    });
    if (values.length === 0) return;
    await save.mutateAsync(values);
    setSaved(true);
  };

  const onRemoveEntry = async (entryIndex: number) => {
    const existsOnServer = section.entries.some(
      (e) => e.entryIndex === entryIndex && Object.keys(e.values).length > 0,
    );
    if (existsOnServer) {
      await removeEntry.mutateAsync({ sectionId: section.id, entryIndex });
    } else {
      setEntries((prev) => prev.filter((_, i) => i !== entryIndex));
    }
  };

  return (
    <div className="rounded-2xl border border-bone-200 bg-white p-6 shadow-[0_8px_32px_-24px_rgba(31,42,92,0.25)] sm:p-8">
      {section.isRepeatable ? (
        <div className="space-y-6">
          {entries.map((entry, entryIndex) => (
            <div key={entryIndex} className="rounded-xl border border-bone-200 bg-bone-50 p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-medium text-ink-500">#{entryIndex + 1}</span>
                <button
                  type="button"
                  onClick={() => void onRemoveEntry(entryIndex)}
                  className="inline-flex items-center gap-1.5 text-sm text-error-500 transition-colors hover:text-error-700"
                >
                  <Trash size={16} />
                  حذف
                </button>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                {scalarFields.filter((f) => isVisible(f, entry)).map((f) => (
                  <DynamicField
                    key={f.id}
                    field={f}
                    value={entry[f.key]}
                    onChange={(v) => setValue(entryIndex, f.key, v)}
                  />
                ))}
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setEntries((prev) => [...prev, {}])}
            className="inline-flex items-center gap-2 rounded-xl border border-dashed border-bone-300 px-5 py-3 text-sm font-medium text-ink-500 transition-colors hover:border-saffron-500/60 hover:text-saffron-700"
          >
            <Plus size={17} />
            إضافة {localize(section.title)}
          </button>
        </div>
      ) : (
        <>
          {scalarFields.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2">
              {scalarFields
                .filter((f) => isVisible(f, entries[0] ?? {}))
                .map((f) => (
                  <DynamicField
                    key={f.id}
                    field={f}
                    value={entries[0]?.[f.key]}
                    onChange={(v) => setValue(0, f.key, v)}
                  />
                ))}
            </div>
          )}
          {fileFields.length > 0 && (
            <div className={`space-y-3 ${scalarFields.length > 0 ? 'mt-6' : ''}`}>
              {fileFields.map((f) => (
                <FileFieldRow
                  key={f.id}
                  field={f}
                  entryIndex={0}
                  current={section.entries[0]?.values[f.key]}
                />
              ))}
            </div>
          )}
        </>
      )}

      {scalarFields.length > 0 && (
        <div className="mt-8 flex items-center gap-4 border-t border-bone-200 pt-6">
          <Button onClick={() => void onSave()} loading={save.isPending}>
            حفظ القسم
          </Button>
          {saved && <span className="text-sm text-turquoise-700">تم الحفظ ✓</span>}
          {save.isError && (
            <span className="text-sm text-error-700">تحقق من القيم المدخلة ثم أعد المحاولة.</span>
          )}
        </div>
      )}
    </div>
  );
}
