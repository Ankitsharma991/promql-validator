import stylesheet from './styles.css?inline';

/** The default stylesheet as a string, e.g. to render into `<head>` during SSR. */
export const promqlStylesheet: string = stylesheet;

export const STYLE_ELEMENT_ID = 'promql-validator-styles';

/**
 * Adds the default stylesheet to the document once. It's inserted as the first child of
 * `<head>`, so any stylesheet the app loads overrides it without needing extra specificity.
 * A no-op on the server, when it's already present, or when the app rendered it itself.
 */
export function injectStylesheet(nonce?: string): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ELEMENT_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ELEMENT_ID;
  if (nonce) style.nonce = nonce;
  style.textContent = stylesheet;
  document.head.insertBefore(style, document.head.firstChild);
}
