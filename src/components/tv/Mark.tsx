import React from 'react';

interface MarkProps {
  kind: 'now' | 'keystone' | 'past';
  children?: React.ReactNode;
}

export function Mark({ kind, children }: MarkProps) {
  const glyph = children ?? (kind === 'now' ? '›' : kind === 'keystone' ? '·' : '×');
  return <span className={`tv-mark tv-mark--${kind}`}>{glyph}</span>;
}
