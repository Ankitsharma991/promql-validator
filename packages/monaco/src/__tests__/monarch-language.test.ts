import { describe, expect, it } from 'vitest';
import { monarchLanguage, languageConfiguration } from '../monarch-language.js';

describe('monarchLanguage', () => {
  it('includes known PromQL functions and aggregations from the core dictionary', () => {
    expect((monarchLanguage.functions as string[]).includes('rate')).toBe(true);
    expect((monarchLanguage.aggregations as string[]).includes('sum')).toBe(true);
  });

  it('includes the modifier keywords', () => {
    expect((monarchLanguage.keywords as string[]).includes('by')).toBe(true);
    expect((monarchLanguage.keywords as string[]).includes('unless')).toBe(true);
  });

  it('defines a root tokenizer state', () => {
    expect(monarchLanguage.tokenizer.root).toBeDefined();
    expect(Array.isArray(monarchLanguage.tokenizer.root)).toBe(true);
  });
});

describe('languageConfiguration', () => {
  it('declares bracket pairs matching the PromQL grammar', () => {
    expect(languageConfiguration.brackets).toEqual([
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
    ]);
  });

  it('declares auto-closing pairs for quotes too', () => {
    const openers = languageConfiguration.autoClosingPairs?.map((p) => p.open);
    expect(openers).toContain('"');
    expect(openers).toContain("'");
    expect(openers).toContain('`');
  });
});
