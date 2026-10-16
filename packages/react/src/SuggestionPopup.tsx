import React, { useEffect, useRef } from 'react';
import type { Suggestion } from '@promql-validator/core';
import { SuggestionDocs, SuggestionFooter, SuggestionItemContent, SuggestionStatus } from './SuggestionItemContent.js';
import type { PromQLMessages } from './messages.js';

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
  /** The partial token being completed, used to emphasise matched characters. */
  matchText?: string;
  messages: PromQLMessages;
}

export function itemClassName(selected: boolean, classNames: SuggestionPopupProps['classNames']): string {
  return `promql-suggestion-item ${selected ? classNames?.itemSelected ?? '' : ''} ${classNames?.item ?? ''}`.replace(/\s+/g, ' ').trim();
}

/**
 * Popup chrome shared by the default and virtualized lists: the listbox itself is `children`,
 * followed by status rows, the highlighted item's docs pane and the keyboard-hint footer.
 */
export const SuggestionPopupFrame = React.forwardRef<
  HTMLDivElement,
  Pick<SuggestionPopupProps, 'id' | 'suggestions' | 'highlightedIndex' | 'loading' | 'asyncError' | 'classNames' | 'messages'> & { children: React.ReactNode }
>(function SuggestionPopupFrame({ id, suggestions, highlightedIndex, loading, asyncError, classNames, messages, children }, ref) {
  return (
    <div
      ref={ref}
      className={`promql-suggestion-popup ${classNames?.popup ?? ''}`.trim()}
      // Dismiss-on-outside-click is wired via pointerdown at the root component level;
      // this element only needs to avoid stealing focus from the text input.
      onMouseDown={(e) => e.preventDefault()}
    >
      {children}
      <SuggestionStatus loading={loading} asyncError={asyncError} empty={suggestions.length === 0} messages={messages} />
      <SuggestionDocs id={`${id}-docs`} suggestion={suggestions[highlightedIndex]} messages={messages} />
      {suggestions.length > 0 && <SuggestionFooter count={suggestions.length} messages={messages} />}
    </div>
  );
});

export const SuggestionPopup = React.forwardRef<HTMLDivElement, SuggestionPopupProps>(function SuggestionPopup(props, ref) {
  const { id, suggestions, highlightedIndex, loading, onHover, onSelect, iconMap, classNames, matchText, messages } = props;
  const listRef = useRef<HTMLDivElement>(null);

  // Keep the keyboard-highlighted row visible as the user arrows through a scrolling list.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${highlightedIndex}"]`);
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex]);

  const highlighted = suggestions[highlightedIndex];
  const hasDocs = Boolean(highlighted?.description || highlighted?.detail);

  return (
    <SuggestionPopupFrame ref={ref} {...props}>
      <div ref={listRef} id={id} role="listbox" aria-label={messages.suggestionsLabel} aria-busy={loading || undefined} className="promql-suggestion-list">
        {suggestions.map((s, i) => {
          const selected = i === highlightedIndex;
          return (
            <div
              key={`${s.category ?? ''}::${s.value}::${i}`}
              id={`${id}-option-${i}`}
              data-index={i}
              role="option"
              aria-selected={selected}
              aria-describedby={selected && hasDocs ? `${id}-docs` : undefined}
              data-selected={selected}
              className={itemClassName(selected, classNames)}
              onMouseMove={() => {
                if (!selected) onHover(i);
              }}
              onClick={() => onSelect(i)}
            >
              <SuggestionItemContent suggestion={s} messages={messages} iconMap={iconMap} matchText={matchText} />
            </div>
          );
        })}
      </div>
    </SuggestionPopupFrame>
  );
});
