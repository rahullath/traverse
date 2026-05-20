import React from 'react';

interface DisplayProps {
  children: React.ReactNode;
  as?: 'h1' | 'h2' | 'h3' | 'p';
  className?: string;
}

export function Display({ children, as: Tag = 'h1', className = '' }: DisplayProps) {
  return <Tag className={`tv-display ${className}`}>{children}</Tag>;
}
