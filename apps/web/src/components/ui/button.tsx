'use client';

import { forwardRef } from 'react';
import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion';

type Variant = 'primary' | 'secondary' | 'ghost';

const styles: Record<Variant, string> = {
  primary:
    'bg-gradient-to-l from-saffron-500 to-saffron-400 font-semibold text-ink-950 shadow-[0_8px_20px_-8px_rgba(217,140,15,0.5)] hover:shadow-[0_10px_28px_-8px_rgba(217,140,15,0.6)] disabled:opacity-60 disabled:shadow-none',
  secondary:
    'border border-ink-900/15 bg-white font-medium text-ink-900 hover:border-saffron-600/60 hover:text-saffron-700 disabled:opacity-60',
  ghost: 'text-ink-500 hover:bg-ink-900/5 hover:text-ink-900 disabled:opacity-60',
};

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: Variant;
  loading?: boolean;
  children?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', loading, className = '', children, disabled, ...props },
  ref,
) {
  const reduced = useReducedMotion();
  return (
    <motion.button
      ref={ref}
      whileHover={reduced || disabled || loading ? undefined : { y: -2 }}
      whileTap={reduced || disabled || loading ? undefined : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 transition-shadow duration-200 ${styles[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </motion.button>
  );
});
