import React from 'react';

interface RunwayProps {
  num: string | number;
  unit?: string;
  caption: React.ReactNode;
  label?: string;
}

export function Runway({ num, unit = 'min', caption, label }: RunwayProps) {
  return (
    <section className="tv-runway">
      {label && <div className="tv-label">{label}</div>}
      <div className="tv-runway__num">
        {num}
        {unit && (
          <span style={{ fontSize: 16, color: 'var(--ink-mute)', marginLeft: 4 }}>{unit}</span>
        )}
      </div>
      <div className="tv-runway__label">{caption}</div>
    </section>
  );
}
