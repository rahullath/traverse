import React from 'react';
import { ROUTES, type RouteKey } from './nav';

interface FooterProps {
  active?: RouteKey;
}

export function Footer({ active }: FooterProps) {
  return (
    <nav className="tv-footer" aria-label="primary">
      {ROUTES.map((r) => (
        <a key={r.key} href={r.href} aria-current={active === r.key ? 'true' : 'false'} title={r.desc}>
          {r.label}
        </a>
      ))}
    </nav>
  );
}
