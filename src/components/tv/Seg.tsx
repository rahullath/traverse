import React from 'react';

type Option = string | { value: string; label: string };

interface SegProps {
  value: string;
  options: Option[];
  onChange: (v: string) => void;
}

function optionValue(o: Option): string  { return typeof o === 'string' ? o : o.value; }
function optionLabel(o: Option): string  { return typeof o === 'string' ? o : o.label; }

export function Seg({ value, options, onChange }: SegProps) {
  return (
    <div className="tv-seg" role="group">
      {options.map((o) => {
        const v = optionValue(o);
        return (
          <button
            key={v}
            type="button"
            aria-pressed={value === v}
            onClick={() => onChange(v)}
          >
            {optionLabel(o)}
          </button>
        );
      })}
    </div>
  );
}
