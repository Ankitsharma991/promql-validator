import React from 'react';
import type { Suggestion } from '@promql-validator/core';
import { SuggestionItemContent } from './SuggestionItemContent.js';

export interface SuggestionPopupProps {
  id: string;
  suggestions: Suggestion[];
  highlightedIndex: number;
  loading: boolean;
  asyncError: unknown;
  onHover: (index: number) => void;
  onSelect: (index: number) => void;
  iconMap?: Record<string, React.ReactNode>;
  classNames?: { popup?: string; item?: string; itemSelected?: string };
}

export const SuggestionPopup = React.forwardRef<HTMLDivElement, SuggestionPopupProps>(function SuggestionPopup(
  { id, suggestions, highlightedIndex, loading, asyncError, onHover, onSelect, iconMap, classNames },
  ref,
) {
  return (
    <div
      ref={ref}
      id={id}
      role="listbox"
      className={`promql-suggestion-popup ${classNames?.popup ?? ''}`.trim()}
      // Dismiss-on-outside-click is wired via pointerdown at the root component level;
      // this element only needs to avoid stealing focus from the text input.
      onMouseDown={(e) => e.preventDefault()}
    >
      {suggestions.length === 0 && !loading && <div className="promql-suggestion-empty">No matches</div>}
      {suggestions.map((s, i) => {
        const selected = i === highlightedIndex;
        return (
          <div
            key={`${s.category ?? ''}::${s.value}::${i}`}
            id={`${id}-option-${i}`}
            role="option"
            aria-selected={selected}
            data-selected={selected}
            className={`promql-suggestion-item ${selected ? classNames?.itemSelected ?? '' : ''} ${classNames?.item ?? ''}`.trim()}
            onMouseEnter={() => onHover(i)}
            onClick={() => onSelect(i)}
          >
            <SuggestionItemContent suggestion={s} iconMap={iconMap} />
          </div>
        );
      })}
      {loading && <div className="promql-suggestion-loading">Loading…</div>}
      {asyncError ? <div className="promql-suggestion-loading">Couldn't load suggestions.</div> : null}
    </div>
  );
});
