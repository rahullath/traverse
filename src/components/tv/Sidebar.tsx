import React from 'react';
import { ROUTES, type RouteKey } from './nav';

interface SidebarProps {
  active?: RouteKey;
}

export function Sidebar({ active }: SidebarProps) {
  return (
    <div className="tv-sidebar">
      <div className="tv-sidebar__mark">traverse</div>
      <nav aria-label="primary">
        {ROUTES.map((r) => (
          <a key={r.key} href={r.href} aria-current={active === r.key ? 'true' : 'false'} title={r.desc}>
            {r.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
