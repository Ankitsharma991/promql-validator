import { useEffect, useLayoutEffect } from 'react';

/**
 * `useLayoutEffect` warns and no-ops during SSR (Part 31's SSR-safety requirement) since
 * there's no DOM to lay out. This falls back to `useEffect` on the server — its one use
 * here (restoring caret position after a programmatic value change) is purely a client-side
 * concern anyway, so the fallback changes nothing observable.
 */
export const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;
