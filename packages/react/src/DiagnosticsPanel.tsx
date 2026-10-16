import React, { useState } from 'react';
import { getQuickFix, type Diagnostic, type QuickFix } from '@promql-validator/core';
import { SEVERITY_ICONS } from './icons.js';

export interface DiagnosticsPanelProps {
  /** The query the diagnostics were computed for (enables text-dependent quick fixes). */
  query?: string;
  diagnostics: Diagnostic[];
  maxVisible: number;
  onSelect: (diagnostic: Diagnostic) => void;
  /** Omit to disable the quick-fix UI entirely. */
  onApplyFix?: (fix: QuickFix) => void;
  classNames?: { diagnostics?: string; diagnosticItem?: string };
}

const SEVERITY_ORDER: Record<Diagnostic['severity'], number> = { error: 0, warning: 1, info: 2 };

export function DiagnosticsPanel({ query, diagnostics, maxVisible, onSelect, onApplyFix, classNames }: DiagnosticsPanelProps) {
  const [expanded, setExpanded] = useState(false);
  if (diagnostics.length === 0) return null;

  const sorted = [...diagnostics].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  const visible = expanded ? sorted : sorted.slice(0, maxVisible);
  const remaining = sorted.length - visible.length;

  return (
    <div className={`promql-diagnostics-panel ${classNames?.diagnostics ?? ''}`.trim()} role="alert" aria-live="polite">
      {visible.map((d, i) => {
        const fix = onApplyFix ? getQuickFix(d, query) : null;
        const Icon = SEVERITY_ICONS[d.severity];
        return (
          // A plain (non-interactive) row containing two sibling buttons — never nest a
          // real <button> inside a role="button" element: nested interactive controls are
          // an accessibility anti-pattern (ambiguous keyboard/screen-reader activation, and
          // the outer element's computed accessible name would swallow the inner button's
          // text, making the two indistinguishable to assistive tech and to accessible-name
          // queries alike).
          <div key={`${d.code}-${d.start}-${i}`} className={`promql-diagnostic-item ${classNames?.diagnosticItem ?? ''}`.trim()} data-severity={d.severity}>
            <span className="promql-diagnostic-icon">
              <Icon />
            </span>
            <button type="button" className="promql-diagnostic-message" onClick={() => onSelect(d)}>
              <span>{d.message}</span>
              {d.suggestion ? <span className="promql-diagnostic-suggestion"> — {d.suggestion}</span> : null}
            </button>
            <span className="promql-diagnostic-position" title={`Line ${d.line}, column ${d.column}`}>
              {d.line}:{d.column}
            </span>
            {fix && (
              <button type="button" className="promql-diagnostic-fix" onClick={() => onApplyFix!(fix)}>
                {fix.label}
              </button>
            )}
          </div>
        );
      })}
      {!expanded && remaining > 0 && (
        <button type="button" className="promql-diagnostics-more" onClick={() => setExpanded(true)}>
          Show {remaining} more
        </button>
      )}
    </div>
  );
}
