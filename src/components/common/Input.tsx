import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({ label, error, className = '', id, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-base-subtext font-heading tracking-wider uppercase">
          {label}
        </label>
      )}
      <input id={id} className={`input-field ${error ? 'border-status-missed' : ''} ${className}`} {...props} />
      {error && <p className="text-xs text-status-missed">{error}</p>}
    </div>
  );
}
