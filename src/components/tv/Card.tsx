import React from 'react';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'quote';
  className?: string;
}

export function Card({ children, variant = 'default', className = '' }: CardProps) {
  return (
    <div className={`tv-card${variant === 'quote' ? ' tv-card--quote' : ''} ${className}`}>
      {children}
    </div>
  );
}
