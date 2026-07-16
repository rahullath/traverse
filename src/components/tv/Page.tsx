import React from 'react';
import { Footer } from './Footer';
import { Sidebar } from './Sidebar';
import type { RouteKey } from './nav';

interface PageProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  motion?: boolean;
  theme?: 'daylight' | 'lamp';
  density?: 'standard' | 'roomy';
  active?: RouteKey;
  wide?: boolean;
}

export function Page({ children, header, motion = true, theme, density, active, wide }: PageProps) {
  const style: React.CSSProperties = density === 'roomy' ? { ['--density' as string]: '1.15' } : {};
  return (
    <div
      className="tv-app"
      data-theme={theme ?? undefined}
      data-motion={motion ? undefined : 'off'}
      style={style}
    >
      <Sidebar active={active} />
      <div className="tv-content">
        {header && header}
        <main className={`tv-page${motion ? ' tv-fade' : ''}`} data-wide={wide ? 'true' : undefined}>
          {children}
        </main>
      </div>
      <Footer active={active} />
    </div>
  );
}
