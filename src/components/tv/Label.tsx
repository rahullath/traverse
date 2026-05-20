import React from 'react';

interface LabelProps {
  children: React.ReactNode;
  as?: 'span' | 'div' | 'p';
  className?: string;
}

export function Label({ children, as: Tag = 'div', className = '' }: LabelProps) {
  return <Tag className={`tv-label ${className}`}>{children}</Tag>;
}
