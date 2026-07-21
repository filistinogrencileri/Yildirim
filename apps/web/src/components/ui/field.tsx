'use client';

import { forwardRef, useId, type InputHTMLAttributes, type SelectHTMLAttributes } from 'react';

const inputCls =
  'w-full rounded-xl border border-bone-300 bg-white px-4 py-3 text-ink-900 placeholder:text-ink-300 outline-none transition-all duration-200 focus:border-saffron-500 focus:shadow-[0_0_0_3px_rgba(245,166,35,0.15)] aria-[invalid=true]:border-error-500/70';

interface FieldWrapperProps {
  label: string;
  error?: string;
  hint?: string;
  htmlFor: string;
  children: React.ReactNode;
}

export function FieldWrapper({ label, error, hint, htmlFor, children }: FieldWrapperProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-sm font-medium text-ink-700">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="mt-1.5 text-xs text-error-700">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-ink-300">{hint}</p>
      ) : null}
    </div>
  );
}

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, hint, className = '', ...props },
  ref,
) {
  const id = useId();
  return (
    <FieldWrapper label={label} error={error} hint={hint} htmlFor={id}>
      <input
        ref={ref}
        id={id}
        aria-invalid={!!error}
        className={`${inputCls} ${className}`}
        {...props}
      />
    </FieldWrapper>
  );
});

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, error, hint, className = '', children, ...props },
  ref,
) {
  const id = useId();
  return (
    <FieldWrapper label={label} error={error} hint={hint} htmlFor={id}>
      <select ref={ref} id={id} aria-invalid={!!error} className={`${inputCls} ${className}`} {...props}>
        {children}
      </select>
    </FieldWrapper>
  );
});
