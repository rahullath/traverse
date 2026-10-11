import React from 'react';

interface RuleProps {
  strong?: boolean;
  className?: string;
}

export function Rule({ strong = false, className = '' }: RuleProps) {
  return <hr className={`tv-rule${strong ? ' tv-rule-strong' : ''} ${className}`} />;
}
