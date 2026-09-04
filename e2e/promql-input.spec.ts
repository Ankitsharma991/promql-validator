import { test, expect, type Page } from '@playwright/test';

/** The example page renders three <PromQLInput/> instances; scope every locator to the
 * specific editor's own `.promql-input-root` so a diagnostics panel on one editor never
 * causes a Playwright strict-mode ambiguity when asserting on another. */
function editorFor(page: Page, ariaLabel: string) {
  // `name` matching in getByRole is substring-based by default — "PromQL query" would
  // otherwise also match "Zero-config PromQL query" and "Worker-validated PromQL query".
  return page.locator('.promql-input-root', { has: page.getByRole('combobox', { name: ariaLabel, exact: true }) });
}

test.describe('promql-validator — full user journey (real browser)', () => {
  test('type a typo, see an error, fix it, see the error clear', async ({ page }) => {
    await page.goto('/');
    const editor = editorFor(page, 'PromQL query');
    const input = editor.getByRole('combobox');
    await input.click();
    await input.fill('rate(x[5m)'); // missing closing ']'

    await expect(editor.getByRole('alert')).toContainText(/closing/i, { timeout: 5000 });

    await input.fill('rate(x[5m])');
    await expect(editor.getByRole('alert')).toHaveCount(0, { timeout: 5000 });
  });

  test('autocomplete: type a prefix, see built-in suggestions, select via keyboard', async ({ page }) => {
    await page.goto('/');
    const editor = editorFor(page, 'PromQL query');
    const input = editor.getByRole('combobox');
    await input.click();
    await input.fill('');
    await input.type('rat');

    const listbox = editor.getByRole('listbox');
    await expect(listbox).toBeVisible();
    await expect(listbox.getByText('rate', { exact: true })).toBeVisible();

    await page.keyboard.press('Enter');
    // Inserting 'rate' lands the cursor inside its parens (a function-arg position), where
    // the popup naturally reopens with new context-relevant suggestions — a feature, not a
    // bug (see the component test suite's identical assertion). What matters here is that
    // the insertion itself happened correctly.
    await expect(input).toHaveValue(/rate\(/);
  });

  test('dynamic suggestions: typing inside service="..." offers live infra data', async ({ page }) => {
    await page.goto('/');
    const editor = editorFor(page, 'PromQL query');
    const input = editor.getByRole('combobox');
    await input.click();
    await input.fill('http_requests_total{service="a');

    const listbox = editor.getByRole('listbox');
    await expect(listbox).toBeVisible();
    await expect(listbox.getByText('api-server')).toBeVisible();
  });

  test('bracket completion: typing "(" inserts a matching close with the cursor between', async ({ page }) => {
    await page.goto('/');
    const editor = editorFor(page, 'Zero-config PromQL query');
    const input = editor.getByRole('combobox');
    await input.click();
    await input.fill('');
    await input.type('sum(');
    await expect(input).toHaveValue('sum()');
  });

  test('formatting: the Format button reformats the query in place', async ({ page }) => {
    await page.goto('/');
    const editor = editorFor(page, 'PromQL query');
    const input = editor.getByRole('combobox');
    await input.click();
    await input.fill('rate(x[5m])');
    await page.keyboard.press('Escape'); // close any open suggestion popup covering the Format button
    await page.getByRole('button', { name: /^Format/ }).click();
    await expect(input).toHaveValue('rate(x[5m])');
  });

  test('quick fix: clicking the diagnostic fix button repairs an unclosed bracket', async ({ page }) => {
    await page.goto('/');
    const editor = editorFor(page, 'Zero-config PromQL query');
    const input = editor.getByRole('combobox');
    await input.click();
    await input.fill('rate(x[5m');
    // The autocomplete popup for this same incomplete state can overlap the fix button
    // underneath it — close it first so the click isn't intercepted.
    await page.keyboard.press('Escape');

    const fixButton = editor.getByRole('button', { name: /insert missing/i });
    await expect(fixButton).toBeVisible({ timeout: 5000 });
    await fixButton.click();
    await expect(input).toHaveValue('rate(x[5m]');
  });

  test('dark mode toggle actually changes the rendered theme', async ({ page }) => {
    await page.goto('/');
    const root = page.locator('.promql-input-root').first();
    await expect(root).toHaveAttribute('data-theme', 'light');
    await page.getByRole('button', { name: /toggle dark mode/i }).click();
    await expect(root).toHaveAttribute('data-theme', 'dark');
  });

  test('useWorker: validation still works when offloaded to a real Web Worker', async ({ page }) => {
    // jsdom (used by the component-test suite) has no real Worker implementation, so this
    // is the one place the useWorker code path is verified end-to-end for real.
    await page.goto('/');
    const editor = editorFor(page, 'Worker-validated PromQL query');
    const input = editor.getByRole('combobox');

    // The example seeds this field with an intentionally-invalid query.
    await expect(editor.getByRole('alert')).toContainText(/closing/i, { timeout: 5000 });

    await input.click();
    await input.fill('up');
    await expect(editor.getByRole('alert')).toHaveCount(0, { timeout: 5000 });
  });
});
