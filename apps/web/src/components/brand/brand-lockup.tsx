import Link from 'next/link';

type Size = 'sm' | 'md' | 'lg';

const SIZES: Record<Size, { icon: string; tr: string; ar: string; gap: string }> = {
  sm: { icon: 'size-9', tr: 'text-[11px]', ar: 'text-[11px]', gap: 'gap-2' },
  md: { icon: 'size-11', tr: 'text-[13px] sm:text-[15px]', ar: 'text-[12px] sm:text-[13px]', gap: 'gap-2.5' },
  lg: { icon: 'size-16', tr: 'text-lg sm:text-xl', ar: 'text-base sm:text-lg', gap: 'gap-4' },
};

/**
 * The official brand lockup: icon mark + wordmark as real text (not an image).
 * Colors are sampled from the designer lockup: navy #1B3457 / gold #BA8528.
 * In RTL flow the icon sits to the right, wordmark to its left — matching the
 * reference artwork.
 */
export function BrandLockup({
  size = 'md',
  href = '/',
  className = '',
  hideTextOnMobile = false,
}: {
  size?: Size;
  href?: string | null;
  className?: string;
  hideTextOnMobile?: boolean;
}) {
  const s = SIZES[size];
  const content = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-mark.png" alt="يلدريم" className={`${s.icon} shrink-0 object-contain`} />
      <span className={`flex min-w-0 flex-col leading-tight ${hideTextOnMobile ? 'max-sm:hidden' : ''}`}>
        <span
          dir="ltr"
          className={`font-heading font-bold uppercase tracking-tight text-brand-navy ${s.tr}`}
        >
          YILDIRIM EĞİTİM HİZMETLERİ
        </span>
        <span className={`font-heading font-bold text-brand-gold ${s.ar}`}>
          يلدريم للخدمات التعليمية
        </span>
      </span>
    </>
  );
  const cls = `flex items-center ${s.gap} ${className}`;
  if (href === null) return <span className={cls}>{content}</span>;
  return (
    <Link href={href} className={cls}>
      {content}
    </Link>
  );
}
