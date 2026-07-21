'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle, FilePdf, Trash, UploadSimple } from '@phosphor-icons/react';
import type { LegalType } from '@yildirim/shared';
import { legalPdfHref, useRemoveLegalPdf, useSaveLegal, useUploadLegalPdf } from '@/lib/site';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';

interface Props {
  type: LegalType;
  initial: { title: string; body: string; hasPdf: boolean };
}

/** Editor for one legal document: title + body text + optional PDF. */
export function LegalEditor({ type, initial }: Props) {
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const [saved, setSaved] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const save = useSaveLegal();
  const upload = useUploadLegalPdf();
  const remove = useRemoveLegalPdf();

  useEffect(() => {
    setTitle(initial.title);
    setBody(initial.body);
  }, [initial.title, initial.body]);

  const onSave = async () => {
    setSaved(false);
    await save.mutateAsync({ type, title, body });
    setSaved(true);
  };

  return (
    <div className="space-y-4">
      <TextField label="العنوان" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div>
        <label className="mb-2 block text-sm font-medium text-ink-700">النص</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={7}
          className="w-full rounded-xl border border-bone-300 bg-white px-4 py-3 leading-7 text-ink-900 outline-none transition-all focus:border-saffron-500 focus:shadow-[0_0_0_3px_rgba(245,166,35,0.15)]"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-bone-200 bg-bone-50 px-4 py-3">
        <span className={`grid size-10 place-items-center rounded-lg ${initial.hasPdf ? 'bg-turquoise-50 text-turquoise-600' : 'bg-bone-200/60 text-ink-300'}`}>
          {initial.hasPdf ? <CheckCircle size={22} weight="fill" /> : <FilePdf size={22} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink-900">ملف PDF (اختياري)</p>
          {initial.hasPdf ? (
            <a
              href={legalPdfHref(type)}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-turquoise-700 hover:underline"
            >
              عرض الملف الحالي
            </a>
          ) : (
            <p className="text-xs text-ink-300">لم يُرفع ملف بعد</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={upload.isPending}
          className="inline-flex items-center gap-2 rounded-xl border border-ink-900/15 bg-white px-4 py-2 text-sm font-medium text-ink-900 transition-colors hover:border-saffron-600/60 hover:text-saffron-700 disabled:opacity-60"
        >
          {upload.isPending ? (
            <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <UploadSimple size={16} />
          )}
          {initial.hasPdf ? 'استبدال' : 'رفع'}
        </button>
        {initial.hasPdf && (
          <button
            type="button"
            onClick={() => void remove.mutateAsync(type)}
            className="inline-flex items-center gap-1.5 text-sm text-error-500 hover:text-error-700"
          >
            <Trash size={15} />
            حذف
          </button>
        )}
        <input
          ref={fileInput}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload.mutateAsync({ type, file: f }).finally(() => {
              if (fileInput.current) fileInput.current.value = '';
            });
          }}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button loading={save.isPending} onClick={() => void onSave()}>
          حفظ
        </Button>
        {saved && <span className="text-sm text-turquoise-700">تم الحفظ ✓</span>}
      </div>
    </div>
  );
}
