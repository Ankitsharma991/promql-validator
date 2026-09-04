import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Suggestion } from '@promql-validator/core';
import { SuggestionItemContent } from './SuggestionItemContent.js';
import type { SuggestionPopupProps } from './SuggestionPopup.js';

/**
 * Opt-in virtualized suggestion list (`suggestionListMode="virtualized"`). Lives in its own
 * module, loaded only via `React.lazy(() => import(...))` from `PromQLInput.tsx`, so
 * `@tanstack/react-virtual` — an *optional* peer dependency (see package.json) — is never
 * pulled into a consumer's bundle unless this mode is actually used (Part 27.2/35: v1's
 * default ranked-cap rendering already keeps the DOM small; this is only worth the extra
 * dependency when a host has a real need to let users browse far more than ~50 candidates).
 */
function VirtualizedSuggestionPopupImpl({ id, suggestions, highlightedIndex, loading, asyncError, onHover, onSelect, iconMap, classNames }: SuggestionPopupProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: suggestions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  return (
    <div
      ref={parentRef}
      id={id}
      role="listbox"
      className={`promql-suggestion-popup ${classNames?.popup ?? ''}`.trim()}
      style={{ overflowY: 'auto' }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {suggestions.length === 0 && !loading && <div className="promql-suggestion-empty">No matches</div>}
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const s: Suggestion | undefined = suggestions[virtualRow.index];
          if (!s) return null;
          const selected = virtualRow.index === highlightedIndex;
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              id={`${id}-option-${virtualRow.index}`}
              role="option"
              aria-selected={selected}
              data-selected={selected}
              className={`promql-suggestion-item ${selected ? classNames?.itemSelected ?? '' : ''} ${classNames?.item ?? ''}`.trim()}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${virtualRow.start}px)` }}
              onMouseEnter={() => onHover(virtualRow.index)}
              onClick={() => onSelect(virtualRow.index)}
            >
              <SuggestionItemContent suggestion={s} iconMap={iconMap} />
            </div>
          );
        })}
      </div>
      {loading && <div className="promql-suggestion-loading">Loading…</div>}
      {asyncError ? <div className="promql-suggestion-loading">Couldn't load suggestions.</div> : null}
    </div>
  );
}

export default VirtualizedSuggestionPopupImpl;
