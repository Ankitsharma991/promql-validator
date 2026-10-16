import React from 'react';
import type { Suggestion } from '@promql-validator/core';

// Inline 16px-grid SVG icons, drawn with `currentColor` so they follow the theme tokens.
// Kept local (rather than an icon-library dependency) to keep the package dependency-free.

const svgProps = {
  width: 14,
  height: 14,
  viewBox: '0 0 16 16',
  fill: 'none',
  'aria-hidden': true,
  focusable: false,
} as const;

export function ErrorIcon() {
  return (
    <svg {...svgProps}>
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.75 5.75l4.5 4.5m0-4.5l-4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function WarningIcon() {
  return (
    <svg {...svgProps}>
      <path d="M7.13 2.5a1 1 0 011.74 0l5.4 9.5a1 1 0 01-.87 1.5H2.6a1 1 0 01-.87-1.5l5.4-9.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 6.25v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="11.25" r=".85" fill="currentColor" />
    </svg>
  );
}

export function InfoIcon() {
  return (
    <svg {...svgProps}>
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 7.25v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="4.9" r=".85" fill="currentColor" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg {...svgProps}>
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.25 8.25l1.9 1.9 3.6-3.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export const SEVERITY_ICONS = { error: ErrorIcon, warning: WarningIcon, info: InfoIcon } as const;

export interface SuggestionKind {
  /** Stable id, exposed as `data-kind` for styling. */
  id: string;
  /** One- or two-character glyph shown in the kind badge. */
  glyph: string;
  /** Human-readable kind, shown when a suggestion has no `detail`. */
  label: string;
}

const KNOWN_KINDS: Record<string, SuggestionKind> = {
  'promql-function': { id: 'function', glyph: 'ƒ', label: 'function' },
  function: { id: 'function', glyph: 'ƒ', label: 'function' },
  aggregation: { id: 'aggregation', glyph: 'Σ', label: 'aggregation' },
  operator: { id: 'operator', glyph: '±', label: 'operator' },
  modifier: { id: 'keyword', glyph: 'K', label: 'keyword' },
  keyword: { id: 'keyword', glyph: 'K', label: 'keyword' },
  duration: { id: 'duration', glyph: 'D', label: 'duration' },
  'label-name': { id: 'label', glyph: 'L', label: 'label' },
  label: { id: 'label', glyph: 'L', label: 'label' },
  metric: { id: 'metric', glyph: 'M', label: 'metric' },
  'metric-name': { id: 'metric', glyph: 'M', label: 'metric' },
  'monitoring-term': { id: 'term', glyph: '#', label: 'term' },
  custom: { id: 'custom', glyph: '•', label: 'custom' },
};

/**
 * Maps a suggestion's free-form `category` to a visual kind. Unknown categories — typically
 * host-provided label-value groups such as `service` or `pod` — render as values, labelled
 * with the category name itself.
 */
export function getSuggestionKind(s: Suggestion): SuggestionKind {
  const category = s.category ?? 'custom';
  return KNOWN_KINDS[category] ?? { id: 'value', glyph: 'V', label: category };
}
