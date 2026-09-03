import React, { useState } from 'react';
import type { Diagnostic } from '@promql-validator/core';

export interface DiagnosticsPanelProps {
  diagnostics: Diagnostic[];
  maxVisible: number;
  onSelect: (diagnostic: Diagnostic) => void;
  classNames?: { diagnostics?: string; diagnosticItem?: string };
}

const SEVERITY_ORDER: Record<Diagnostic['severity'], number> = { error: 0, warning: 1, info: 2 };

export function DiagnosticsPanel({ diagnostics, maxVisible, onSelect, classNames }: DiagnosticsPanelProps) {
  const [expanded, setExpanded] = useState(false);
  if (diagnostics.length === 0) return null;

  const sorted = [...diagnostics].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  const visible = expanded ? sorted : sorted.slice(0, maxVisible);
  const remaining = sorted.length - visible.length;

  return (
    <div className={`promql-diagnostics-panel ${classNames?.diagnostics ?? ''}`.trim()} role="alert" aria-live="polite">
      {visible.map((d, i) => (
        <div
          key={`${d.code}-${d.start}-${i}`}
          className={`promql-diagnostic-item ${classNames?.diagnosticItem ?? ''}`.trim()}
          data-severity={d.severity}
          role="button"
          tabIndex={0}
          onClick={() => onSelect(d)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelect(d);
            }
          }}
        >
          <span>{d.message}</span>
          {d.suggestion ? <span> — {d.suggestion}</span> : null}
        </div>
      ))}
      {!expanded && remaining > 0 && (
        <div className="promql-diagnostics-more" role="button" tabIndex={0} onClick={() => setExpanded(true)}>
          +{remaining} more
        </div>
      )}
    </div>
  );
}
