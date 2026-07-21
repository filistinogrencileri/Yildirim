'use client';

import {
  CheckCircle,
  Clock,
  FileText,
  Lightning,
  MagnifyingGlass,
  WarningCircle,
  XCircle,
} from '@phosphor-icons/react';
import { motion, useReducedMotion } from 'framer-motion';
import type { RequestStatus } from '@yildirim/shared';

export const STATUS_LABELS: Record<RequestStatus, string> = {
  DRAFT: 'مسودة',
  SUBMITTED: 'بانتظار المراجعة',
  UNDER_REVIEW: 'قيد المراجعة',
  NEEDS_ACTION: 'بحاجة لاستكمال',
  IN_PROGRESS: 'قيد التنفيذ',
  COMPLETED: 'مكتمل',
  CANCELLED: 'ملغى',
};

const STYLES: Record<RequestStatus, { cls: string; icon: React.ElementType; fill?: boolean; pulse?: boolean }> = {
  DRAFT: { cls: 'border-ink-100 text-ink-500', icon: FileText },
  SUBMITTED: { cls: 'border-ink-100 bg-ink-900/5 text-ink-700', icon: Clock },
  UNDER_REVIEW: { cls: 'border-saffron-300 bg-saffron-50 text-saffron-700', icon: MagnifyingGlass },
  NEEDS_ACTION: { cls: 'border-error-300 bg-error-50 text-error-700', icon: WarningCircle },
  IN_PROGRESS: { cls: 'border-saffron-400 bg-saffron-100 text-saffron-700', icon: Lightning, fill: true, pulse: true },
  COMPLETED: { cls: 'border-turquoise-300 bg-turquoise-50 text-turquoise-700', icon: CheckCircle, fill: true },
  CANCELLED: { cls: 'border-ink-100 text-ink-300', icon: XCircle },
};

export function StatusChip({ status, size = 'md' }: { status: RequestStatus; size?: 'sm' | 'md' }) {
  const reduced = useReducedMotion();
  const s = STYLES[status];
  const Icon = s.icon;
  const icon = <Icon size={size === 'sm' ? 13 : 15} weight={s.fill ? 'fill' : 'regular'} />;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${s.cls} ${
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm'
      }`}
    >
      {s.pulse && !reduced ? (
        <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.8, repeat: Infinity }} className="flex">
          {icon}
        </motion.span>
      ) : (
        icon
      )}
      {STATUS_LABELS[status]}
    </span>
  );
}
