/**
 * Bounded, linear-time subsequence fuzzy matcher — deliberately not regex-based (avoids
 * any catastrophic-backtracking / ReDoS risk on adversarial input).
 *
 * Returns a score in [0, 1] when `needle`'s characters appear as a subsequence of
 * `haystack` (case-insensitive), or `null` when they don't match at all. Denser,
 * earlier, more-contiguous matches score higher.
 */
export function fuzzyScore(needle: string, haystack: string): number | null {
  if (needle.length === 0) return 0;
  if (needle.length > haystack.length) return null;

  const n = needle.toLowerCase();
  const h = haystack.toLowerCase();

  let hi = 0;
  let firstMatchIndex = -1;
  let lastMatchIndex = -1;
  let contiguousRun = 0;
  let bestContiguousRun = 0;

  for (let ni = 0; ni < n.length; ni++) {
    const ch = n[ni];
    let found = -1;
    for (; hi < h.length; hi++) {
      if (h[hi] === ch) {
        found = hi;
        break;
      }
    }
    if (found === -1) return null;
    if (firstMatchIndex === -1) firstMatchIndex = found;
    if (lastMatchIndex !== -1 && found === lastMatchIndex + 1) {
      contiguousRun++;
    } else {
      contiguousRun = 1;
    }
    bestContiguousRun = Math.max(bestContiguousRun, contiguousRun);
    lastMatchIndex = found;
    hi = found + 1;
  }

  const span = lastMatchIndex - firstMatchIndex + 1;
  const density = n.length / span; // 1.0 when the match is fully contiguous
  const earlyBonus = 1 - firstMatchIndex / (h.length + 1);
  const contiguityBonus = bestContiguousRun / n.length;

  const score = 0.5 * density + 0.3 * contiguityBonus + 0.2 * earlyBonus;
  return Math.max(0, Math.min(1, score));
}
