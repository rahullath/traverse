import React from 'react';

interface ProseProps {
  children: React.ReactNode;
  as?: 'p' | 'div' | 'span';
  className?: string;
  style?: React.CSSProperties;
}

export function Prose({ children, as: Tag = 'p', className = '', style }: ProseProps) {
  return <Tag className={`tv-prose ${className}`} style={style}>{children}</Tag>;
}
