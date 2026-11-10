export interface AutocompleteSuggestion {
  term: string;
  count: number;
  rank: number;
  matchType: 'prefix' | 'word' | 'substring';
  matchIndex: number;
  matchLength: number;
  inlineCompletionSuffix?: string;
}

/**
 * Generates ranked autocomplete suggestions based on `searchFrequencies` as the user types.
 * Prioritizes:
 * 1. Exact prefix matches (case-insensitive)
 * 2. Word-boundary matches (e.g. typing "bunny" matches "Big Buck Bunny")
 * 3. Substring matches
 * Within each match tier, suggestions are ordered by frequency count descending.
 */
export function getAutocompleteSuggestions(
  inputQuery: string,
  searchFrequencies: Record<string, number>,
  limit = 6
): AutocompleteSuggestion[] {
  const cleanInput = inputQuery.trim();
  if (!cleanInput) {
    return [];
  }

  const lowerInput = cleanInput.toLowerCase();

  // Rank all entries by frequency first so each suggestion knows its global popularity rank
  const rankedEntries = Object.entries(searchFrequencies)
    .filter(([term, count]) => term.trim().length > 0 && typeof count === 'number' && count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([term, count], idx) => ({
      term: term.trim(),
      count,
      rank: idx + 1,
    }));

  const matches: AutocompleteSuggestion[] = [];

  for (const entry of rankedEntries) {
    const lowerTerm = entry.term.toLowerCase();

    // Skip if the user has already typed the exact full term and there are no other variations
    if (lowerTerm === lowerInput) {
      continue;
    }

    const matchIndex = lowerTerm.indexOf(lowerInput);
    if (matchIndex === -1) {
      continue;
    }

    let matchType: 'prefix' | 'word' | 'substring' = 'substring';
    let inlineCompletionSuffix: string | undefined;

    if (matchIndex === 0) {
      matchType = 'prefix';
      inlineCompletionSuffix = entry.term.slice(cleanInput.length);
    } else {
      const charBefore = lowerTerm[matchIndex - 1];
      if (charBefore === ' ' || charBefore === '-' || charBefore === '.' || charBefore === '_') {
        matchType = 'word';
      }
    }

    matches.push({
      term: entry.term,
      count: entry.count,
      rank: entry.rank,
      matchType,
      matchIndex,
      matchLength: cleanInput.length,
      inlineCompletionSuffix,
    });
  }

  const tierPriority: Record<AutocompleteSuggestion['matchType'], number> = {
    prefix: 0,
    word: 1,
    substring: 2,
  };

  matches.sort((a, b) => {
    const tierDiff = tierPriority[a.matchType] - tierPriority[b.matchType];
    if (tierDiff !== 0) return tierDiff;
    if (b.count !== a.count) return b.count - a.count;
    return a.term.localeCompare(b.term);
  });

  return matches.slice(0, limit);
}

/**
 * Splits a suggestion term into [beforeMatch, matchedSegment, afterMatch] for rich UI highlighting.
 */
export function splitSuggestionHighlight(suggestion: AutocompleteSuggestion): {
  before: string;
  matched: string;
  after: string;
} {
  const { term, matchIndex, matchLength } = suggestion;
  return {
    before: term.slice(0, matchIndex),
    matched: term.slice(matchIndex, matchIndex + matchLength),
    after: term.slice(matchIndex + matchLength),
  };
}
