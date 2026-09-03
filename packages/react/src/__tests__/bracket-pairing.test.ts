import { describe, expect, it } from 'vitest';
import { handleBackspace, handleTypedCharacter } from '../bracket-pairing.js';

const OPTS = { autoCloseBrackets: true, autoCloseQuotes: true };

describe('handleTypedCharacter', () => {
  it('inserts a pair with the cursor between on an opener with no selection', () => {
    const result = handleTypedCharacter('(', { value: '', selectionStart: 0, selectionEnd: 0 }, OPTS);
    expect(result).toEqual({ value: '()', cursorStart: 1, cursorEnd: 1, handled: true });
  });

  it('wraps an active selection', () => {
    const result = handleTypedCharacter('(', { value: 'rate', selectionStart: 0, selectionEnd: 4 }, OPTS);
    expect(result?.value).toBe('(rate)');
    expect(result?.cursorStart).toBe(5);
  });

  it('types over a matching closer instead of duplicating', () => {
    const result = handleTypedCharacter(')', { value: '()', selectionStart: 1, selectionEnd: 1 }, OPTS);
    expect(result).toEqual({ value: '()', cursorStart: 2, cursorEnd: 2, handled: true });
  });

  it('inserts literally when the closer does not match what is at the cursor', () => {
    const result = handleTypedCharacter(')', { value: 'a]b', selectionStart: 1, selectionEnd: 1 }, OPTS);
    expect(result).toBeNull();
  });

  it('respects autoCloseBrackets: false', () => {
    const result = handleTypedCharacter('(', { value: '', selectionStart: 0, selectionEnd: 0 }, { ...OPTS, autoCloseBrackets: false });
    expect(result).toBeNull();
  });

  it('respects autoCloseQuotes: false independently of brackets', () => {
    const result = handleTypedCharacter('"', { value: '', selectionStart: 0, selectionEnd: 0 }, { ...OPTS, autoCloseQuotes: false });
    expect(result).toBeNull();
  });

  it('pairs quotes the same way as brackets', () => {
    const result = handleTypedCharacter('"', { value: '', selectionStart: 0, selectionEnd: 0 }, OPTS);
    expect(result?.value).toBe('""');
  });
});

describe('handleBackspace', () => {
  it('deletes an empty auto-inserted pair as one unit', () => {
    const result = handleBackspace({ value: '()', selectionStart: 1, selectionEnd: 1 }, OPTS);
    expect(result).toEqual({ value: '', cursorStart: 0, cursorEnd: 0, handled: true });
  });

  it('does not special-case a pair that has content between it', () => {
    const result = handleBackspace({ value: '(x)', selectionStart: 2, selectionEnd: 2 }, OPTS);
    expect(result).toBeNull();
  });

  it('does nothing at the start of the input', () => {
    const result = handleBackspace({ value: 'abc', selectionStart: 0, selectionEnd: 0 }, OPTS);
    expect(result).toBeNull();
  });

  it('does nothing when there is an active selection', () => {
    const result = handleBackspace({ value: '()', selectionStart: 0, selectionEnd: 2 }, OPTS);
    expect(result).toBeNull();
  });
});
