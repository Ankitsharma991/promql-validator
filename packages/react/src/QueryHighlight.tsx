import React, { useMemo } from 'react';
import type { Diagnostic } from '@promql-validator/core';
import { buildHighlightSegments } from './highlight.js';

export interface QueryHighlightProps {
  value: string;
  diagnostics: readonly Diagnostic[];
}

/**
 * Syntax-coloured mirror of the query, laid exactly over the `<input>` (whose own text is
 * transparent). Purely visual — aria-hidden and pointer-events: none — so focus, selection,
 * IME, undo and accessibility all stay with the native input. The parent keeps the inner
 * element's horizontal offset in sync with the input's `scrollLeft`.
 */
export const QueryHighlight = React.forwardRef<HTMLSpanElement, QueryHighlightProps>(function QueryHighlight({ value, diagnostics }, ref) {
  const segments = useMemo(() => buildHighlightSegments(value, diagnostics), [value, diagnostics]);
  return (
    <span className="promql-input-highlight" aria-hidden="true">
      <span ref={ref} className="promql-input-highlight-content">
        {segments.map((seg, i) => (
          // Text is rendered from `data-text` via CSS `::before`, so the mirrored query never
          // shows up a second time in the DOM's text content (find-in-page, text queries).
          <span key={i} className={`promql-tok-${seg.kind}`} data-severity={seg.severity} data-text={seg.text} />
        ))}
      </span>
    </span>
  );
});
