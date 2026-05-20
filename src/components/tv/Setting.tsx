import React from 'react';

interface SettingProps {
  name: string;
  hint?: string;
  control: React.ReactNode;
}

export function Setting({ name, hint, control }: SettingProps) {
  return (
    <div className="tv-setting">
      <div className="tv-setting__label">
        <span className="tv-setting__name">{name}</span>
        {hint && <span className="tv-setting__hint">{hint}</span>}
      </div>
      <div className="tv-setting__control">{control}</div>
    </div>
  );
}
