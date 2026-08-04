import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  elevated?: boolean;
}

export default function Card({ children, elevated, className = '', ...props }: CardProps) {
  return (
    <div className={`card ${elevated ? 'bg-base-elevated/95' : ''} ${className}`} {...props}>
      {children}
    </div>
  );
}
