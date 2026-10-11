import React from 'react';

export type BlockState = 'past' | 'now' | 'next' | 'future';

interface BlockProps {
  time: string;
  state: BlockState;
  name: string;
  meta?: string;
  note?: string;
  keystone?: boolean;
  anchor?: boolean;
  keystoneMark?: boolean;
}

function computeMark(state: BlockState, keystone: boolean, keystoneMark: boolean): string {
  if (state === 'now') return '›';
  if (state === 'past') {
    if (keystone && keystoneMark) return '·';
    if (!keystone) return '×';
    return '';
  }
  return '';
}

export function Block({
  time,
  state,
  name,
  meta,
  note,
  keystone = false,
  anchor = false,
  keystoneMark = true,
}: BlockProps) {
  const mark = computeMark(state, keystone, keystoneMark);
  const cls = [
    'tv-block',
    `tv-block--${state === 'next' ? 'future' : state}`,
    keystone ? 'tv-block--keystone' : '',
  ].filter(Boolean).join(' ');

  const metaParts = [meta, note].filter(Boolean);

  return (
    <article className={cls}>
      <div className="tv-block__time">{time}</div>
      <div className="tv-block__gutter">{mark}</div>
      <div className="tv-block__body">
        <div className="tv-block__name" style={anchor ? { fontStyle: 'italic' } : undefined}>
          {name}
        </div>
        {metaParts.length > 0 && (
          <div className="tv-block__meta">
            {metaParts.map((p, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span>  ·  </span>}
                {p}
              </React.Fragment>
            ))}
            {keystone && keystoneMark && (
              <span style={{ color: 'var(--accent-soft)' }}>  ·  keystone</span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
