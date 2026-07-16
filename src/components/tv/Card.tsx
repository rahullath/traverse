import React from 'react';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'quote';
  className?: string;
  style?: React.CSSProperties;
}

export function Card({ children, variant = 'default', className = '', style }: CardProps) {
  return (
    <div className={`tv-card${variant === 'quote' ? ' tv-card--quote' : ''} ${className}`} style={style}>
      {children}
    </div>
  );
}
