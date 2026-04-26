import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({ label, error, className = '', id, ...props }: InputProps) {
  const errorId = error && id ? `${id}-error` : undefined;
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-base-subtext font-heading tracking-wider uppercase">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`input-field ${error ? 'border-status-missed' : ''} ${className}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        {...props}
      />
      {error && (
        <p id={errorId} role="alert" className="text-xs text-status-missed">
          {error}
        </p>
      )}
    </div>
  );
}
