import React from 'react';

interface LatenessInfo {
  late: boolean;
  overByMinutes?: number;
  maxLateMinutes: number;
  nextFeasibleDeparture?: string | null;
}

interface TimingStripProps {
  startBy: string;
  leaveBy: string | null;
  anchorAt: string;
  note?: React.ReactNode;
  lateness?: LatenessInfo;
}

export function TimingStrip({ startBy, leaveBy, anchorAt, note, lateness }: TimingStripProps) {
  return (
    <>
      <div className="tv-timing">
        <div className="tv-timing__item">
          <span className="tv-timing__label">start by</span>
          <span className="tv-timing__val">{startBy}</span>
        </div>
        <div className="tv-timing__item tv-timing__item--leave">
          <span className="tv-timing__label">leave by</span>
          <span className="tv-timing__val">{leaveBy ?? '—'}</span>
        </div>
        <div className="tv-timing__item">
          <span className="tv-timing__label">anchor at</span>
          <span className="tv-timing__val">{anchorAt}</span>
        </div>
      </div>
      {note && <p className="tv-timing__note">{note}</p>}
      {lateness && (
        <div className={`tv-lateness ${lateness.late ? 'tv-lateness--late' : 'tv-lateness--ontrack'}`}>
          {lateness.late
            ? `likely late by ~${lateness.overByMinutes ?? '?'}min · max late ${lateness.maxLateMinutes}min${lateness.nextFeasibleDeparture ? ` · next feasible departure ${lateness.nextFeasibleDeparture}` : ''}`
            : `on track · strict max late ${lateness.maxLateMinutes}min`}
        </div>
      )}
    </>
  );
}
