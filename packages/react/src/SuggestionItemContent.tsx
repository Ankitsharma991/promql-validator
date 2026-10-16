import React from 'react';
import type { Suggestion } from '@promql-validator/core';
import { getSuggestionKind } from './icons.js';
import { matchIndices } from './highlight.js';
import type { PromQLMessages } from './messages.js';

export interface SuggestionItemContentProps {
  suggestion: Suggestion;
  messages: PromQLMessages;
  iconMap?: Record<string, React.ReactNode>;
  /** The partial token being completed; matching characters in the label are emphasised. */
  matchText?: string;
}

/**
 * Renders `label` with the matched characters emphasised. The real label stays a single text
 * node (so the option's accessible name and text queries are unaffected); the emphasised
 * copy is a purely visual, aria-hidden layer drawn exactly on top of it.
 */
function MatchedLabel({ label, matchText }: { label: string; matchText?: string }) {
  const indices = matchText ? matchIndices(label, matchText) : [];
  if (indices.length === 0) return <span className="promql-suggestion-label">{label}</span>;

  const matched = new Set(indices);
  const parts: React.ReactNode[] = [];
  let run = '';
  let runMatched = matched.has(0);
  const flush = (key: number) => {
    if (!run) return;
    // Text via `data-text` + CSS `::before` so the label isn't duplicated in the DOM's text.
    parts.push(runMatched ? <mark key={key} data-text={run} /> : <span key={key} data-text={run} />);
    run = '';
  };
  for (let i = 0; i < label.length; i++) {
    const m = matched.has(i);
    if (m !== runMatched) {
      flush(i);
      runMatched = m;
    }
    run += label[i];
  }
  flush(label.length);

  return (
    <span className="promql-suggestion-label" data-matched="true">
      <span className="promql-suggestion-label-text">{label}</span>
      <span className="promql-suggestion-label-overlay" aria-hidden="true">
        {parts}
      </span>
    </span>
  );
}

/** Shared row markup between the default (ranked-cap) and virtualized suggestion popups. */
export function SuggestionItemContent({ suggestion: s, messages, iconMap, matchText }: SuggestionItemContentProps) {
  const kind = getSuggestionKind(s);
  const kindLabel = messages.kindLabels[kind.id] ?? kind.label;
  const customIcon = s.icon ? iconMap?.[s.icon] : undefined;
  return (
    <>
      <span className="promql-suggestion-kind" data-kind={kind.id} data-custom-icon={customIcon ? 'true' : undefined} aria-hidden="true" title={kindLabel}>
        {customIcon ?? kind.glyph}
      </span>
      <MatchedLabel label={s.label} matchText={matchText} />
      <span className="promql-suggestion-detail">{s.detail ?? kindLabel}</span>
    </>
  );
}

/** Documentation pane for the highlighted suggestion, shown beneath the list. */
export function SuggestionDocs({ id, suggestion: s, messages }: { id: string; suggestion: Suggestion | undefined; messages: PromQLMessages }) {
  if (!s || (!s.description && !s.detail)) return null;
  const kind = getSuggestionKind(s);
  return (
    <div id={id} className="promql-suggestion-docs">
      <div className="promql-suggestion-docs-header">
        <span className="promql-suggestion-docs-kind" data-kind={kind.id}>
          {messages.kindLabels[kind.id] ?? kind.label}
        </span>
        {s.detail ? <code className="promql-suggestion-docs-signature">{s.detail}</code> : null}
      </div>
      {s.description ? <p className="promql-suggestion-docs-description">{s.description}</p> : null}
    </div>
  );
}

export function SuggestionFooter({ count, messages }: { count: number; messages: PromQLMessages }) {
  return (
    <div className="promql-suggestion-footer" aria-hidden="true">
      <span>
        <kbd>↑</kbd>
        <kbd>↓</kbd> {messages.hintNavigate}
      </span>
      <span>
        <kbd>↵</kbd> {messages.hintInsert}
      </span>
      <span>
        <kbd>esc</kbd> {messages.hintClose}
      </span>
      <span className="promql-suggestion-footer-count">{messages.resultCount(count)}</span>
    </div>
  );
}

export function SuggestionStatus({ loading, asyncError, empty, messages }: { loading: boolean; asyncError: unknown; empty: boolean; messages: PromQLMessages }) {
  return (
    <>
      {empty && !loading && !asyncError && <div className="promql-suggestion-empty">{messages.noMatches}</div>}
      {loading && (
        <div className="promql-suggestion-loading">
          <span className="promql-spinner" aria-hidden="true" />
          {messages.loading}
        </div>
      )}
      {asyncError ? <div className="promql-suggestion-loading promql-suggestion-error">{messages.loadError}</div> : null}
    </>
  );
}
