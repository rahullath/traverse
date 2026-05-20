import React from 'react';

interface PageProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  motion?: boolean;
  theme?: 'daylight' | 'lamp';
  density?: 'standard' | 'roomy';
}

export function Page({ children, header, motion = true, theme, density }: PageProps) {
  const style: React.CSSProperties = density === 'roomy' ? { ['--density' as string]: '1.15' } : {};
  return (
    <div
      className="tv-app"
      data-theme={theme ?? undefined}
      data-motion={motion ? undefined : 'off'}
      style={style}
    >
      {header && header}
      <main className={`tv-page${motion ? ' tv-fade' : ''}`}>
        {children}
      </main>
    </div>
  );
}
