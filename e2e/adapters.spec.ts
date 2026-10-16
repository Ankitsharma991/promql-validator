import { test, expect } from '@playwright/test';

/** These tests exist because @promql-validator/monaco and @promql-validator/codemirror can
 * only be meaningfully verified against their real host editors — jsdom (used by the unit
 * test suites for both packages) has no real Monaco/CodeMirror rendering pipeline, canvas, or
 * layout engine, so mounting, live diagnostics, and completion widgets are unverified without
 * a real browser. */
test.describe('promql-validator — Monaco adapter (real browser)', () => {
  test('mounts with the seeded query and renders it as real editor content', async ({ page }) => {
    await page.goto('/');
    const monaco = page.getByTestId('monaco-demo');
    await expect(monaco.locator('.monaco-editor')).toBeVisible({ timeout: 10_000 });
    await expect(monaco.locator('.view-lines')).toContainText('http_requests_total');
  });

  test('live diagnostics: an invalid query gets a squiggly error marker, a fix clears it', async ({ page }) => {
    await page.goto('/');
    const monaco = page.getByTestId('monaco-demo');
    await expect(monaco.locator('.monaco-editor')).toBeVisible({ timeout: 10_000 });

    // Click the editor's rendered lines rather than the hidden `textarea.inputarea` directly —
    // Monaco's own mouse handling focuses that textarea for us, and clicking it directly is
    // flaky since rendered text spans sit on top of it and intercept the pointer event.
    await monaco.locator('.view-lines').click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('rate(x[5m)'); // missing closing ']'

    await expect(monaco.locator('.squiggly-error')).toBeVisible({ timeout: 5000 });

    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('rate(x[5m])');
    await expect(monaco.locator('.squiggly-error')).toHaveCount(0, { timeout: 5000 });
  });

  test('completion: typing a function prefix opens Monaco\'s real suggest widget', async ({ page }) => {
    await page.goto('/');
    const monaco = page.getByTestId('monaco-demo');
    await expect(monaco.locator('.monaco-editor')).toBeVisible({ timeout: 10_000 });

    // Click the editor's rendered lines rather than the hidden `textarea.inputarea` directly —
    // Monaco's own mouse handling focuses that textarea for us, and clicking it directly is
    // flaky since rendered text spans sit on top of it and intercept the pointer event.
    await monaco.locator('.view-lines').click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('histogram_quan');
    await page.keyboard.press('Control+Space');

    await expect(page.locator('.monaco-editor .suggest-widget')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.monaco-editor .suggest-widget')).toContainText('histogram_quantile');
  });
});

test.describe('promql-validator — CodeMirror 6 adapter (real browser)', () => {
  test('mounts with the seeded query and renders it as real editor content', async ({ page }) => {
    await page.goto('/');
    const cm = page.getByTestId('codemirror-demo');
    await expect(cm.locator('.cm-editor')).toBeVisible({ timeout: 10_000 });
    await expect(cm.locator('.cm-content')).toContainText('http_requests_total');
  });

  test('live linting: the seeded query is intentionally invalid and shows an inline diagnostic', async ({ page }) => {
    await page.goto('/');
    const cm = page.getByTestId('codemirror-demo');
    await expect(cm.locator('.cm-editor')).toBeVisible({ timeout: 10_000 });

    // The demo seeds "rate(http_requests_total[5m)" — ']' closed with ')' instead.
    await expect(cm.locator('.cm-lintRange-error')).toBeVisible({ timeout: 5000 });

    const content = cm.locator('.cm-content');
    await content.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('rate(http_requests_total[5m])');
    await expect(cm.locator('.cm-lintRange-error')).toHaveCount(0, { timeout: 5000 });
  });

  test('completion: typing a function prefix opens the real autocomplete tooltip', async ({ page }) => {
    await page.goto('/');
    const cm = page.getByTestId('codemirror-demo');
    await expect(cm.locator('.cm-editor')).toBeVisible({ timeout: 10_000 });

    const content = cm.locator('.cm-content');
    await content.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('rat');

    await expect(page.locator('.cm-tooltip-autocomplete')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.cm-tooltip-autocomplete')).toContainText('rate');
  });
});
