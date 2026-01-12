interface Player {
  id: string;
  name: string;
}

export interface ParsedScore {
  playerId: string;
  playerName: string;
  score: number;
}

export interface ParseResult {
  success: boolean;
  scores: ParsedScore[];
  unrecognized: string[];
  rawTranscript: string;
}

// Word numbers to digits
const wordToNumber: Record<string, number> = {
  'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'eleven': 11, 'twelve': 12,
  'won': 1, 'to': 2, 'too': 2, 'for': 4, 'fore': 4,
  'tree': 3, 'free': 3,
};

// Golf terms to relative par
const golfTerms: Record<string, number> = {
  'ace': -3,           // hole in one (works for par 4)
  'hole in one': -3,
  'albatross': -3,
  'double eagle': -3,
  'eagle': -2,
  'birdie': -1,
  'par': 0,
  'bogey': 1,
  'bogie': 1,
  'bogy': 1,
  'double': 2,
  'double bogey': 2,
  'double bogie': 2,
  'triple': 3,
  'triple bogey': 3,
  'triple bogie': 3,
  'snowman': 8,        // golf slang for 8
};

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,!?]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function findPlayerMatch(text: string, players: Player[]): Player | null {
  const normalizedText = normalizeText(text);
  
  for (const player of players) {
    const playerNameLower = player.name.toLowerCase();
    const nameParts = playerNameLower.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];
    
    // Check full name, first name, or last name
    if (
      normalizedText.includes(playerNameLower) ||
      normalizedText.includes(firstName) ||
      (nameParts.length > 1 && normalizedText.includes(lastName))
    ) {
      return player;
    }
  }
  
  return null;
}

function extractScore(text: string, par: number): number | null {
  const normalizedText = normalizeText(text);
  
  // Check for golf terms first (they take precedence)
  for (const [term, relative] of Object.entries(golfTerms)) {
    if (normalizedText.includes(term)) {
      const score = par + relative;
      if (score >= 1 && score <= 12) {
        return score;
      }
    }
  }
  
  // Try direct number match
  const numberMatch = normalizedText.match(/\b(\d{1,2})\b/);
  if (numberMatch) {
    const num = parseInt(numberMatch[1], 10);
    if (num >= 1 && num <= 12) {
      return num;
    }
  }
  
  // Try word numbers
  for (const [word, num] of Object.entries(wordToNumber)) {
    // Use word boundary to avoid partial matches
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(normalizedText)) {
      if (num >= 1 && num <= 12) {
        return num;
      }
    }
  }
  
  return null;
}

export function parseVoiceInput(
  transcript: string,
  players: Player[],
  currentPar: number = 4
): ParseResult {
  const scores: ParsedScore[] = [];
  const unrecognized: string[] = [];
  const processedPlayerIds = new Set<string>();
  
  const text = normalizeText(transcript);
  
  // Handle "all fours", "all fives", etc.
  const allMatch = text.match(/\ball\s+(fours?|fives?|sixes?|sevens?|eights?|threes?|pars?|bogeys?|birdies?|(\w+))\b/i);
  if (allMatch) {
    let score: number | null = null;
    const word = allMatch[1].replace(/s$/, '').toLowerCase();
    
    // Check direct number words
    const numberMap: Record<string, number> = {
      'three': 3, 'four': 4, 'five': 5, 'six': 6, 
      'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    };
    
    if (numberMap[word]) {
      score = numberMap[word];
    } else if (word === 'par') {
      score = currentPar;
    } else if (word === 'birdie') {
      score = currentPar - 1;
    } else if (word === 'bogey' || word === 'bogie') {
      score = currentPar + 1;
    } else if (wordToNumber[word]) {
      score = wordToNumber[word];
    }
    
    if (score && score >= 1 && score <= 12) {
      players.forEach(player => {
        scores.push({
          playerId: player.id,
          playerName: player.name,
          score,
        });
        processedPlayerIds.add(player.id);
      });
      return { success: true, scores, unrecognized, rawTranscript: transcript };
    }
  }
  
  // Split by common separators
  const segments = text
    .split(/[,.]|\band\b|\bthen\b/)
    .map(s => s.trim())
    .filter(Boolean);
  
  for (const segment of segments) {
    const player = findPlayerMatch(segment, players);
    
    if (player && !processedPlayerIds.has(player.id)) {
      const score = extractScore(segment, currentPar);
      
      if (score) {
        scores.push({
          playerId: player.id,
          playerName: player.name,
          score,
        });
        processedPlayerIds.add(player.id);
      } else {
        unrecognized.push(segment);
      }
    } else if (!player && segment.length > 2) {
      // Check if this segment has a score but no player (might be continuation)
      const score = extractScore(segment, currentPar);
      if (!score) {
        unrecognized.push(segment);
      }
    }
  }
  
  // Try a more aggressive single-segment parse if we didn't get all players
  if (scores.length === 0 && players.length <= 4) {
    // Try matching patterns like "Jack 5 Tim 4"
    let remainingText = text;
    
    for (const player of players) {
      if (processedPlayerIds.has(player.id)) continue;
      
      const playerNameLower = player.name.toLowerCase();
      const firstName = playerNameLower.split(' ')[0];
      
      // Look for player name followed by a number or term
      const patterns = [
        new RegExp(`\\b${firstName}\\s+(?:got\\s+(?:a\\s+)?)?(?:made\\s+(?:a\\s+)?)?(?:had\\s+(?:a\\s+)?)?(\\d+|${Object.keys(wordToNumber).join('|')}|${Object.keys(golfTerms).join('|')})\\b`, 'i'),
        new RegExp(`\\b${firstName}\\s+(\\d+)\\b`, 'i'),
      ];
      
      for (const pattern of patterns) {
        const match = remainingText.match(pattern);
        if (match) {
          const scoreText = match[1] || match[0];
          const score = extractScore(scoreText, currentPar) || extractScore(match[0], currentPar);
          
          if (score) {
            scores.push({
              playerId: player.id,
              playerName: player.name,
              score,
            });
            processedPlayerIds.add(player.id);
            remainingText = remainingText.replace(match[0], '');
            break;
          }
        }
      }
    }
  }
  
  return {
    success: scores.length > 0,
    scores,
    unrecognized: unrecognized.filter(u => u.length > 2),
    rawTranscript: transcript,
  };
}
