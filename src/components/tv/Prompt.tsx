import React from 'react';

interface PromptProps {
  label?: string;
  title: string;
  caption?: string;
  onClose?: () => void;
  closeLabel?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}

export function Prompt({
  label,
  title,
  caption,
  onClose,
  closeLabel = 'close',
  children,
  footer,
}: PromptProps) {
  return (
    <div className="tv-prompt" role="dialog" aria-label={title}>
      <div className="tv-prompt__header">
        {label && <div className="tv-label">{label}</div>}
        {onClose && (
          <button className="tv-close" onClick={onClose}>{closeLabel}</button>
        )}
      </div>
      <h2 className="tv-prompt__title">{title}</h2>
      {caption && <p className="tv-prompt__caption">{caption}</p>}
      {children && <div className="tv-actions">{children}</div>}
      {footer && <p className="tv-foot-note">{footer}</p>}
    </div>
  );
}
