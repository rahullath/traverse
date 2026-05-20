import React from 'react';

type Variant = 'default' | 'primary' | 'quiet' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  hint?: string;
  children: React.ReactNode;
}

const variantClass: Record<Variant, string> = {
  default: '',
  primary: 'tv-btn--primary',
  quiet:   'tv-btn--quiet',
  ghost:   'tv-btn--ghost',
};

export function Button({ variant = 'default', hint, children, className = '', ...rest }: ButtonProps) {
  return (
    <button className={`tv-btn ${variantClass[variant]} ${className}`} {...rest}>
      <span style={{ fontFamily: 'var(--serif)', fontSize: 16 }}>{children}</span>
      {hint && <span className="tv-btn__hint">{hint}</span>}
    </button>
  );
}
