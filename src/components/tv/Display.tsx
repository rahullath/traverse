import React from 'react';

interface DisplayProps {
  children: React.ReactNode;
  as?: 'h1' | 'h2' | 'h3' | 'p';
  className?: string;
  style?: React.CSSProperties;
}

export function Display({ children, as: Tag = 'h1', className = '', style }: DisplayProps) {
  return <Tag className={`tv-display ${className}`} style={style}>{children}</Tag>;
}
