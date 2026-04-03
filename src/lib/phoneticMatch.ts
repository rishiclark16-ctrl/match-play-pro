/**
 * Double Metaphone phonetic matching engine.
 * Provides phonetic similarity matching for voice recognition name resolution.
 * Used as a 4th-tier fallback after exact → nickname → Levenshtein matching.
 */

/**
 * Generate Double Metaphone codes for a word.
 * Returns [primary, alternate] phonetic codes.
 */
export function doubleMetaphone(word: string): [string, string] {
  if (!word || word.length === 0) return ['', ''];

  const input = word.toUpperCase();
  let primary = '';
  let alternate = '';
  let pos = 0;
  const length = input.length;
  const last = length - 1;

  const charAt = (p: number): string => (p >= 0 && p < length ? input[p] : '');
  const isVowel = (ch: string): boolean => 'AEIOU'.includes(ch);
  const stringAt = (start: number, len: number, ...list: string[]): boolean => {
    if (start < 0) return false;
    const target = input.substring(start, start + len);
    return list.includes(target);
  };

  // Skip silent initial letters
  if (stringAt(0, 2, 'GN', 'KN', 'PN', 'AE', 'WR')) {
    pos = 1;
  }

  // Initial X → S
  if (charAt(0) === 'X') {
    primary += 'S';
    alternate += 'S';
    pos = 1;
  }

  while (pos < length && (primary.length < 6 || alternate.length < 6)) {
    const ch = charAt(pos);

    // Skip vowels unless at start
    if (isVowel(ch)) {
      if (pos === 0) {
        primary += 'A';
        alternate += 'A';
      }
      pos++;
      continue;
    }

    switch (ch) {
      case 'B':
        primary += 'P';
        alternate += 'P';
        pos += charAt(pos + 1) === 'B' ? 2 : 1;
        break;

      case 'C':
        if (stringAt(pos, 2, 'CH')) {
          primary += 'X';
          alternate += 'X';
          pos += 2;
        } else if (stringAt(pos, 2, 'CI', 'CE', 'CY')) {
          primary += 'S';
          alternate += 'S';
          pos += 2;
        } else if (stringAt(pos, 2, 'CK', 'CC')) {
          primary += 'K';
          alternate += 'K';
          pos += 2;
        } else {
          primary += 'K';
          alternate += 'K';
          pos += 1;
        }
        break;

      case 'D':
        if (stringAt(pos, 2, 'DG')) {
          if (stringAt(pos + 2, 1, 'I', 'E', 'Y')) {
            primary += 'J';
            alternate += 'J';
            pos += 3;
          } else {
            primary += 'TK';
            alternate += 'TK';
            pos += 2;
          }
        } else {
          primary += 'T';
          alternate += 'T';
          pos += stringAt(pos, 2, 'DT', 'DD') ? 2 : 1;
        }
        break;

      case 'F':
        primary += 'F';
        alternate += 'F';
        pos += charAt(pos + 1) === 'F' ? 2 : 1;
        break;

      case 'G':
        if (charAt(pos + 1) === 'H') {
          if (pos > 0 && !isVowel(charAt(pos - 1))) {
            primary += 'K';
            alternate += 'K';
            pos += 2;
          } else if (pos === 0) {
            primary += 'K';
            alternate += 'K';
            pos += 2;
          } else {
            pos += 2;
          }
        } else if (charAt(pos + 1) === 'N') {
          if (pos === 0) {
            pos += 2;
          } else {
            primary += 'KN';
            alternate += 'N';
            pos += 2;
          }
        } else if (stringAt(pos + 1, 1, 'I', 'E', 'Y')) {
          primary += 'J';
          alternate += 'K';
          pos += 2;
        } else {
          primary += 'K';
          alternate += 'K';
          pos += charAt(pos + 1) === 'G' ? 2 : 1;
        }
        break;

      case 'H':
        if (isVowel(charAt(pos + 1)) && (pos === 0 || !isVowel(charAt(pos - 1)))) {
          primary += 'H';
          alternate += 'H';
          pos += 2;
        } else {
          pos += 1;
        }
        break;

      case 'J':
        primary += 'J';
        alternate += 'J';
        pos += charAt(pos + 1) === 'J' ? 2 : 1;
        break;

      case 'K':
        primary += 'K';
        alternate += 'K';
        pos += charAt(pos + 1) === 'K' ? 2 : 1;
        break;

      case 'L':
        primary += 'L';
        alternate += 'L';
        pos += charAt(pos + 1) === 'L' ? 2 : 1;
        break;

      case 'M':
        primary += 'M';
        alternate += 'M';
        pos += charAt(pos + 1) === 'M' ? 2 : 1;
        break;

      case 'N':
        primary += 'N';
        alternate += 'N';
        pos += charAt(pos + 1) === 'N' ? 2 : 1;
        break;

      case 'P':
        if (charAt(pos + 1) === 'H') {
          primary += 'F';
          alternate += 'F';
          pos += 2;
        } else {
          primary += 'P';
          alternate += 'P';
          pos += stringAt(pos, 2, 'PP', 'PB') ? 2 : 1;
        }
        break;

      case 'Q':
        primary += 'K';
        alternate += 'K';
        pos += charAt(pos + 1) === 'Q' ? 2 : 1;
        break;

      case 'R':
        primary += 'R';
        alternate += 'R';
        pos += charAt(pos + 1) === 'R' ? 2 : 1;
        break;

      case 'S':
        if (stringAt(pos, 2, 'SH')) {
          primary += 'X';
          alternate += 'X';
          pos += 2;
        } else if (stringAt(pos, 3, 'SCH')) {
          primary += 'SK';
          alternate += 'SK';
          pos += 3;
        } else if (stringAt(pos, 2, 'SI', 'SY')) {
          primary += 'S';
          alternate += 'S';
          pos += 2;
        } else {
          primary += 'S';
          alternate += 'S';
          pos += stringAt(pos, 2, 'SS', 'SZ') ? 2 : 1;
        }
        break;

      case 'T':
        if (stringAt(pos, 2, 'TH')) {
          primary += '0'; // theta
          alternate += 'T';
          pos += 2;
        } else if (stringAt(pos, 4, 'TION')) {
          primary += 'XN';
          alternate += 'XN';
          pos += 4;
        } else {
          primary += 'T';
          alternate += 'T';
          pos += stringAt(pos, 2, 'TT', 'TD') ? 2 : 1;
        }
        break;

      case 'V':
        primary += 'F';
        alternate += 'F';
        pos += charAt(pos + 1) === 'V' ? 2 : 1;
        break;

      case 'W':
        if (isVowel(charAt(pos + 1))) {
          primary += 'A';
          alternate += 'F';
          pos += 2;
        } else {
          pos += 1;
        }
        break;

      case 'X':
        primary += 'KS';
        alternate += 'KS';
        pos += charAt(pos + 1) === 'X' ? 2 : 1;
        break;

      case 'Y':
        if (isVowel(charAt(pos + 1))) {
          primary += 'A';
          alternate += 'A';
          pos += 2;
        } else {
          pos += 1;
        }
        break;

      case 'Z':
        primary += 'S';
        alternate += 'S';
        pos += charAt(pos + 1) === 'Z' ? 2 : 1;
        break;

      default:
        pos += 1;
        break;
    }
  }

  return [primary.substring(0, 6), alternate.substring(0, 6)];
}

/**
 * Check if two phonetic codes are similar (differ by at most 1 character).
 */
function fuzzyCodeMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;

  if (a.length === b.length) {
    let diffs = 0;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) diffs++;
    }
    return diffs <= 1;
  }

  // Lengths differ by 1 — check if shorter is a subsequence with 0 edits
  const [shorter, longer] = a.length < b.length ? [a, b] : [b, a];
  let si = 0;
  for (let li = 0; li < longer.length && si < shorter.length; li++) {
    if (shorter[si] === longer[li]) si++;
  }
  return si === shorter.length;
}

/**
 * Check if two strings match phonetically using Double Metaphone.
 * Uses fuzzy code comparison to catch near-matches (e.g., Sean/Shawn).
 */
export function phoneticMatch(input: string, target: string): boolean {
  if (!input || !target) return false;

  const [inputPrimary, inputAlt] = doubleMetaphone(input);
  const [targetPrimary, targetAlt] = doubleMetaphone(target);

  if (!inputPrimary || !targetPrimary) return false;

  // Check all 4 code combinations with fuzzy matching
  const codes: [string, string][] = [[inputPrimary, targetPrimary]];
  if (targetAlt) codes.push([inputPrimary, targetAlt]);
  if (inputAlt) codes.push([inputAlt, targetPrimary]);
  if (inputAlt && targetAlt) codes.push([inputAlt, targetAlt]);

  return codes.some(([a, b]) => fuzzyCodeMatch(a, b));
}

/**
 * Calculate phonetic similarity distance between two strings (0-1 scale).
 * 1 = perfect match, 0 = no similarity.
 */
export function phoneticDistance(a: string, b: string): number {
  if (!a || !b) return 0;

  const [aPrimary, aAlt] = doubleMetaphone(a);
  const [bPrimary, bAlt] = doubleMetaphone(b);

  if (!aPrimary || !bPrimary) return 0;

  // Check all code combinations and return best score
  const codePairs: [string, string][] = [[aPrimary, bPrimary]];
  if (bAlt) codePairs.push([aPrimary, bAlt]);
  if (aAlt) codePairs.push([aAlt, bPrimary]);
  if (aAlt && bAlt) codePairs.push([aAlt, bAlt]);

  let best = 0;
  for (const [codeA, codeB] of codePairs) {
    if (!codeA || !codeB) continue;
    if (codeA === codeB) return 1;

    const maxLen = Math.max(codeA.length, codeB.length);
    if (maxLen === 0) continue;

    let matches = 0;
    const minLen = Math.min(codeA.length, codeB.length);
    for (let i = 0; i < minLen; i++) {
      if (codeA[i] === codeB[i]) matches++;
    }
    best = Math.max(best, matches / maxLen);
  }

  return best;
}

/**
 * Find the best phonetic match from a list of candidates.
 * Returns null if no match exceeds the threshold.
 */
export function findBestPhoneticMatch(
  input: string,
  candidates: string[],
  threshold: number = 0.5
): { match: string; score: number } | null {
  if (!input || candidates.length === 0) return null;

  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const candidate of candidates) {
    // Check exact phonetic match first
    if (phoneticMatch(input, candidate)) {
      return { match: candidate, score: 1 };
    }

    // Fall back to distance scoring
    const score = phoneticDistance(input, candidate);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = candidate;
    }
  }

  if (bestMatch && bestScore >= threshold) {
    return { match: bestMatch, score: bestScore };
  }

  return null;
}
