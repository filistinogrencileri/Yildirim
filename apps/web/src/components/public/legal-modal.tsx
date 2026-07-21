'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FilePdf, X } from '@phosphor-icons/react';
import type { LegalType } from '@yildirim/shared';
import { legalPdfHref, useLegal } from '@/lib/site';

interface Props {
  type: LegalType | null;
  onClose: () => void;
}

/** Modal that shows admin-authored legal text + an optional "open PDF" button. */
export function LegalModal({ type, onClose }: Props) {
  const reduced = useReducedMotion();
  const { data, isLoading } = useLegal(type ?? 'privacy', type !== null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (type) {
      window.addEventListener('keydown', onKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [type, onClose]);

  return (
    <AnimatePresence>
      {type && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-ink-950/50 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-bone-200 bg-white shadow-2xl"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-bone-200 px-6 py-4">
              <h2 className="font-heading text-lg font-bold text-ink-900">
                {data?.title ?? 'جارٍ التحميل…'}
              </h2>
              <button
                onClick={onClose}
                className="grid size-9 place-items-center rounded-xl text-ink-400 transition-colors hover:bg-ink-900/5 hover:text-ink-900"
                aria-label="إغلاق"
              >
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
              {isLoading ? (
                <div className="grid place-items-center py-10">
                  <span className="size-7 animate-spin rounded-full border-2 border-saffron-500 border-t-transparent" />
                </div>
              ) : (
                <p className="whitespace-pre-wrap leading-8 text-ink-700">
                  {data?.body || 'لا يوجد محتوى بعد.'}
                </p>
              )}
            </div>

            {data?.hasPdf && type && (
              <div className="border-t border-bone-200 px-6 py-4">
                <a
                  href={legalPdfHref(type)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-saffron-500 to-saffron-400 px-5 py-2.5 text-sm font-semibold text-ink-950 shadow-[0_8px_20px_-8px_rgba(217,140,15,0.5)]"
                >
                  <FilePdf size={18} weight="fill" />
                  عرض المستند (PDF)
                </a>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
