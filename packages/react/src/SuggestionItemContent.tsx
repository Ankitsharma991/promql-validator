import React from 'react';
import type { Suggestion } from '@promql-validator/core';

export interface SuggestionItemContentProps {
  suggestion: Suggestion;
  iconMap?: Record<string, React.ReactNode>;
}

/** Shared row markup between the default (ranked-cap) and virtualized suggestion popups. */
export function SuggestionItemContent({ suggestion: s, iconMap }: SuggestionItemContentProps) {
  return (
    <>
      <div className="promql-suggestion-item-label-row">
        {s.icon && iconMap?.[s.icon] ? <span aria-hidden="true">{iconMap[s.icon]}</span> : null}
        <span>{s.label}</span>
        {s.category ? <span className="promql-suggestion-item-category">{s.category}</span> : null}
        {s.detail ? <span className="promql-suggestion-item-category">{s.detail}</span> : null}
      </div>
      {s.description ? <div className="promql-suggestion-item-description">{s.description}</div> : null}
    </>
  );
}
