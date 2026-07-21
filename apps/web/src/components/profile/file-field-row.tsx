'use client';

import { useRef, useState } from 'react';
import { CheckCircle, FilePdf, UploadSimple } from '@phosphor-icons/react';
import { localize } from '@yildirim/shared';
import { fileHref, useUploadDocument, type ProfileEntryValue, type ProfileFieldDef } from '@/lib/profile';

interface Props {
  field: ProfileFieldDef;
  entryIndex: number;
  current?: ProfileEntryValue;
}

/**
 * One document row. The PDF-only restriction is enforced quietly via the
 * picker's accept + backend signature validation (plan module 2 — no loud
 * warnings about it).
 */
export function FileFieldRow({ field, entryIndex, current }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadDocument();
  const [error, setError] = useState<string | null>(null);
  const accept = field.type === 'FILE_PDF' ? '.pdf,application/pdf' : 'image/*';
  const uploaded = !!current?.fileId;

  const onPick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      await upload.mutateAsync({ fieldId: field.id, entryIndex, file });
    } catch {
      setError('تعذّر رفع الملف. تأكد من نوع الملف وحجمه ثم أعد المحاولة.');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-bone-200 bg-bone-50 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${uploaded ? 'bg-turquoise-50 text-turquoise-600' : 'bg-bone-200/60 text-ink-300'}`}>
          {uploaded ? <CheckCircle size={22} weight="fill" /> : <FilePdf size={22} />}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-900">
            {localize(field.label)}
            {field.isRequired && <span className="text-error-500"> *</span>}
          </p>
          {uploaded && current?.fileName ? (
            <a
              href={current.fileUrl ? fileHref(current.fileUrl) : undefined}
              target="_blank"
              rel="noreferrer"
              className="block max-w-64 truncate text-xs text-turquoise-700 hover:underline"
              dir="ltr"
            >
              {current.fileName}
            </a>
          ) : (
            <p className="text-xs text-ink-300">لم يُرفع بعد</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {error && <span className="text-xs text-error-700">{error}</span>}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={upload.isPending}
          className="inline-flex items-center gap-2 rounded-xl border border-ink-900/15 bg-white px-4 py-2 text-sm font-medium text-ink-900 transition-colors hover:border-saffron-600/60 hover:text-saffron-700 disabled:opacity-60"
        >
          {upload.isPending ? (
            <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <UploadSimple size={17} />
          )}
          {uploaded ? 'استبدال' : 'رفع الملف'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => void onPick(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}
