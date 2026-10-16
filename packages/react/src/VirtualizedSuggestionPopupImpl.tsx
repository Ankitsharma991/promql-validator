import React, { useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Suggestion } from '@promql-validator/core';
import { SuggestionItemContent } from './SuggestionItemContent.js';
import { SuggestionPopupFrame, itemClassName, type SuggestionPopupProps } from './SuggestionPopup.js';

/**
 * Opt-in virtualized suggestion list (`suggestionListMode="virtualized"`). Lives in its own
 * module, loaded only via `React.lazy(() => import(...))` from `PromQLInput.tsx`, so
 * `@tanstack/react-virtual` — an *optional* peer dependency (see package.json) — is never
 * pulled into a consumer's bundle unless this mode is actually used (Part 27.2/35: v1's
 * default ranked-cap rendering already keeps the DOM small; this is only worth the extra
 * dependency when a host has a real need to let users browse far more than ~50 candidates).
 */
function VirtualizedSuggestionPopupImpl(props: SuggestionPopupProps) {
  const { id, suggestions, highlightedIndex, loading, onHover, onSelect, iconMap, classNames, matchText } = props;
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: suggestions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 30,
    overscan: 10,
  });

  useEffect(() => {
    if (highlightedIndex < suggestions.length) virtualizer.scrollToIndex(highlightedIndex, { align: 'auto' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightedIndex]);

  const highlighted = suggestions[highlightedIndex];
  const hasDocs = Boolean(highlighted?.description || highlighted?.detail);

  return (
    <SuggestionPopupFrame {...props}>
      <div ref={parentRef} id={id} role="listbox" aria-label="Suggestions" aria-busy={loading || undefined} className="promql-suggestion-list">
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
                aria-describedby={selected && hasDocs ? `${id}-docs` : undefined}
                data-selected={selected}
                className={itemClassName(selected, classNames)}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${virtualRow.start}px)` }}
                onMouseMove={() => {
                  if (!selected) onHover(virtualRow.index);
                }}
                onClick={() => onSelect(virtualRow.index)}
              >
                <SuggestionItemContent suggestion={s} iconMap={iconMap} matchText={matchText} />
              </div>
            );
          })}
        </div>
      </div>
    </SuggestionPopupFrame>
  );
}

export default VirtualizedSuggestionPopupImpl;
