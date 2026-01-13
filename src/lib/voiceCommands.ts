// Voice command parsing for game-specific actions and navigation
import { GameConfig } from '@/types/golf';

interface Player {
  id: string;
  name: string;
}

export type VoiceCommandType = 
  | 'wolf_selection'
  | 'wolf_alone'
  | 'wolf_partner'
  | 'press'
  | 'next_hole'
  | 'previous_hole'
  | 'go_to_hole'
  | 'undo'
  | 'score_entry';

export interface VoiceCommand {
  type: VoiceCommandType;
  playerId?: string;
  playerName?: string;
  partnerId?: string;
  partnerName?: string;
  holeNumber?: number;
}

// Levenshtein distance for fuzzy matching
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

function isFuzzyMatch(input: string, target: string, threshold: number = 2): boolean {
  const inputLower = input.toLowerCase();
  const targetLower = target.toLowerCase();
  
  if (inputLower === targetLower) return true;
  if (inputLower.includes(targetLower) || targetLower.includes(inputLower)) return true;
  
  if (target.length <= 3) {
    return levenshteinDistance(inputLower, targetLower) <= 1;
  }
  
  return levenshteinDistance(inputLower, targetLower) <= threshold;
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[.,!?'"-]/g, '').replace(/\s+/g, ' ').trim();
}

// Expanded nickname mappings
const nicknames: Record<string, string[]> = {
  'michael': ['mike', 'mikey', 'mick', 'micah'],
  'william': ['will', 'bill', 'billy', 'liam'],
  'robert': ['rob', 'bob', 'bobby', 'robby', 'robbie'],
  'richard': ['rick', 'dick', 'rich', 'ricky', 'richie'],
  'jonathan': ['jon', 'john', 'johnny', 'jonny'],
  'james': ['jim', 'jimmy', 'jamie', 'jay'],
  'timothy': ['tim', 'timmy'],
  'anthony': ['tony', 'ant', 'antony'],
  'nicholas': ['nick', 'nicky', 'nico'],
  'christopher': ['chris', 'kris', 'topher'],
  'matthew': ['matt', 'matty'],
  'daniel': ['dan', 'danny'],
  'andrew': ['andy', 'drew'],
  'adam': ['ad'],
  'austin': ['aus'],
  'jack': ['jacky', 'jackie'],
  'joseph': ['joe', 'joey'],
  'samuel': ['sam', 'sammy'],
  'benjamin': ['ben', 'benny', 'benji'],
  'joshua': ['josh'],
  'david': ['dave', 'davey'],
  'steven': ['steve', 'stevie', 'stephen'],
  'thomas': ['tom', 'tommy'],
  'patrick': ['pat', 'paddy'],
  'edward': ['ed', 'eddie', 'ted'],
  'alexander': ['alex', 'xander', 'al'],
  'jacob': ['jake'],
  'zachary': ['zach', 'zack'],
  'tyler': ['ty'],
  'ryan': ['ry'],
  'kyle': ['ky'],
  'charles': ['charlie', 'chuck'],
  'peter': ['pete'],
  'henry': ['hank', 'harry'],
  'george': ['georgie'],
};

function findPlayerInText(text: string, players: Player[]): Player | null {
  const normalized = normalizeText(text);
  const words = normalized.split(/\s+/);
  
  // First: exact match on first name or full name
  for (const player of players) {
    const playerLower = player.name.toLowerCase();
    const firstName = playerLower.split(' ')[0];
    const lastName = playerLower.split(' ').pop() || '';
    
    // Exact full name match
    if (normalized.includes(playerLower)) {
      return player;
    }
    
    // Exact first/last name match with word boundaries
    for (const word of words) {
      if (word === firstName || (lastName !== firstName && word === lastName)) {
        return player;
      }
    }
  }
  
  // Second: nickname matching
  for (const player of players) {
    const firstName = player.name.toLowerCase().split(' ')[0];
    
    // Build all variants
    const allVariants: string[] = [firstName];
    Object.entries(nicknames).forEach(([full, nicks]) => {
      if (firstName === full) {
        allVariants.push(...nicks);
      }
      nicks.forEach(nick => {
        if (firstName === nick || isFuzzyMatch(firstName, nick)) {
          allVariants.push(full, ...nicks);
        }
      });
    });
    
    // Check each word against variants
    for (const word of words) {
      for (const variant of allVariants) {
        if (word === variant || isFuzzyMatch(word, variant)) {
          return player;
        }
      }
    }
  }
  
  // Third: fuzzy match
  for (const player of players) {
    const firstName = player.name.toLowerCase().split(' ')[0];
    for (const word of words) {
      if (word.length >= 3 && isFuzzyMatch(word, firstName, 2)) {
        return player;
      }
    }
  }
  
  return null;
}

// Word to number mapping for hole numbers
const wordToNum: Record<string, number> = {
  'one': 1, 'first': 1, 'won': 1,
  'two': 2, 'second': 2, 'to': 2, 'too': 2,
  'three': 3, 'third': 3, 'tree': 3,
  'four': 4, 'fourth': 4, 'for': 4, 'fore': 4,
  'five': 5, 'fifth': 5,
  'six': 6, 'sixth': 6,
  'seven': 7, 'seventh': 7,
  'eight': 8, 'eighth': 8, 'ate': 8,
  'nine': 9, 'ninth': 9,
  'ten': 10, 'tenth': 10,
  'eleven': 11, 'eleventh': 11,
  'twelve': 12, 'twelfth': 12,
  'thirteen': 13, 'thirteenth': 13,
  'fourteen': 14, 'fourteenth': 14,
  'fifteen': 15, 'fifteenth': 15,
  'sixteen': 16, 'sixteenth': 16,
  'seventeen': 17, 'seventeenth': 17,
  'eighteen': 18, 'eighteenth': 18,
};

function extractHoleNumber(text: string): number | null {
  // Try digit match first
  const digitMatch = text.match(/\b(\d{1,2})\b/);
  if (digitMatch) {
    const num = parseInt(digitMatch[1], 10);
    if (num >= 1 && num <= 18) return num;
  }
  
  // Try word match
  const words = text.toLowerCase().split(/\s+/);
  for (const word of words) {
    if (wordToNum[word] !== undefined) {
      return wordToNum[word];
    }
    // Fuzzy match for number words
    for (const [numWord, num] of Object.entries(wordToNum)) {
      if (num <= 18 && isFuzzyMatch(word, numWord, 1)) {
        return num;
      }
    }
  }
  
  return null;
}

export function parseVoiceCommands(
  transcript: string,
  players: Player[],
  games: GameConfig[] = []
): VoiceCommand[] {
  const commands: VoiceCommand[] = [];
  const text = normalizeText(transcript);
  
  // Wolf game commands
  const hasWolfGame = games.some(g => g.type === 'wolf');
  
  if (hasWolfGame) {
    // "Jack is the wolf" / "wolf is Jack" / "Make Jack the wolf"
    const wolfPatterns = [
      /(\b\w+\b)\s+is\s+(?:the\s+)?wolf/i,
      /wolf\s+is\s+(\b\w+\b)/i,
      /(?:make|set)\s+(\b\w+\b)\s+(?:as\s+)?(?:the\s+)?wolf/i,
      /(\b\w+\b)\s+(?:is\s+)?wolf(?:ing)?/i,
    ];
    
    for (const pattern of wolfPatterns) {
      const match = text.match(pattern);
      if (match) {
        const nameWord = match[1];
        const player = findPlayerInText(nameWord, players);
        if (player) {
          commands.push({
            type: 'wolf_selection',
            playerId: player.id,
            playerName: player.name,
          });
          break;
        }
      }
    }
    
    // "Wolf goes alone" / "going alone" / "lone wolf" / "I'll go alone" / "solo"
    const alonePatterns = [
      /wolf\s+(?:goes?\s+)?alone/i,
      /going\s+alone/i,
      /lone\s+wolf/i,
      /(?:i'll|ill|i)\s+go\s+alone/i,
      /solo\s+wolf/i,
      /\balone\b/i,
      /\bsolo\b/i,
    ];
    
    for (const pattern of alonePatterns) {
      if (pattern.test(text)) {
        commands.push({ type: 'wolf_alone' });
        break;
      }
    }
    
    // Partner selection: "Jack picked Tim" / "wolf picks Tim" / "Jack partners with Tim" / "pick Tim"
    const partnerPatterns = [
      /(\b\w+\b)\s+(?:picked|picks|chose|chooses|partners?\s+with|takes?)\s+(\b\w+\b)/i,
      /(?:pick|choose|take|partner\s+with)\s+(\b\w+\b)/i,
      /(\b\w+\b)\s+(?:is\s+)?(?:my|the)\s+partner/i,
    ];
    
    for (const pattern of partnerPatterns) {
      const match = text.match(pattern);
      if (match) {
        if (match[2]) {
          // Two-name pattern: "Jack picked Tim"
          const wolf = findPlayerInText(match[1], players);
          const partner = findPlayerInText(match[2], players);
          if (wolf && partner && wolf.id !== partner.id) {
            commands.push({
              type: 'wolf_partner',
              playerId: wolf.id,
              playerName: wolf.name,
              partnerId: partner.id,
              partnerName: partner.name,
            });
            break;
          } else if (partner) {
            // Just found the partner
            commands.push({
              type: 'wolf_partner',
              partnerId: partner.id,
              partnerName: partner.name,
            });
            break;
          }
        } else if (match[1]) {
          // Single-name pattern: "pick Tim" or "Tim is my partner"
          const partner = findPlayerInText(match[1], players);
          if (partner) {
            commands.push({
              type: 'wolf_partner',
              partnerId: partner.id,
              partnerName: partner.name,
            });
            break;
          }
        }
      }
    }
  }
  
  // Press commands for Nassau
  const hasNassau = games.some(g => g.type === 'nassau');
  if (hasNassau) {
    const pressPatterns = [
      /\bpress\b/i,
      /\bpressing\b/i,
      /\bi\s+press\b/i,
      /\bwe\s+press\b/i,
      /\bauto\s*press\b/i,
    ];
    
    for (const pattern of pressPatterns) {
      if (pattern.test(text)) {
        commands.push({ type: 'press' });
        break;
      }
    }
  }
  
  // Undo commands
  const undoPatterns = [
    /\bundo\b/i,
    /\bgo\s+back\b/i,
    /\bcancel\s+(?:that|last)\b/i,
    /\btake\s+(?:that|it)\s+back\b/i,
    /\bwait\s+no\b/i,
    /\bwrong\b/i,
    /\bactually\b/i,
  ];
  
  for (const pattern of undoPatterns) {
    if (pattern.test(text)) {
      commands.push({ type: 'undo' });
      break;
    }
  }
  
  // Navigation commands - next hole
  const nextPatterns = [
    /\bnext\s+hole\b/i,
    /\bmove\s+(?:on|forward|to\s+next)\b/i,
    /\bforward\b/i,
    /\bonwards?\b/i,
    /\bgo\s+next\b/i,
    /\bcontinue\b/i,
    /\bdone\s+(?:with\s+)?(?:this\s+)?hole\b/i,
    /\bfinish(?:ed)?\s+(?:this\s+)?hole\b/i,
  ];
  
  for (const pattern of nextPatterns) {
    if (pattern.test(text)) {
      commands.push({ type: 'next_hole' });
      break;
    }
  }
  
  // Navigation commands - previous hole
  const prevPatterns = [
    /\bprevious\s+hole\b/i,
    /\bgo\s+back\b/i,
    /\bback\s+(?:a\s+)?hole\b/i,
    /\blast\s+hole\b/i,
    /\bback\s+one\b/i,
  ];
  
  for (const pattern of prevPatterns) {
    if (pattern.test(text)) {
      commands.push({ type: 'previous_hole' });
      break;
    }
  }
  
  // Go to specific hole
  const gotoPatterns = [
    /(?:go\s+to|jump\s+to|skip\s+to)\s+(?:hole\s+)?(\d+|\w+)/i,
    /hole\s+(\d+|\w+)/i,
    /(\d+)(?:st|nd|rd|th)\s+hole/i,
  ];
  
  for (const pattern of gotoPatterns) {
    const match = text.match(pattern);
    if (match) {
      const holeNum = extractHoleNumber(match[1] || match[0]);
      if (holeNum && holeNum >= 1 && holeNum <= 18) {
        commands.push({ type: 'go_to_hole', holeNumber: holeNum });
        break;
      }
    }
  }
  
  return commands;
}

// Check if transcript contains score-related content
export function hasScoreContent(transcript: string): boolean {
  const text = normalizeText(transcript);
  
  // Check for numbers or golf terms
  const scorePatterns = [
    /\b\d{1,2}\b/, // digit
    /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/i,
    /\b(?:par|birdie|bogey|bogie|eagle|double|triple|albatross|ace)\b/i,
    /\ball\s+\w+s?\b/i, // "all fours", "all pars"
    /\bgot\s+(?:a\s+)?/i, // "got a"
    /\bmade\s+(?:a\s+)?/i, // "made a"
    /\bhad\s+(?:a\s+)?/i, // "had a"
    /\bshot\s+(?:a\s+)?/i, // "shot a"
    /\bscored\s+(?:a\s+)?/i, // "scored a"
  ];
  
  return scorePatterns.some(pattern => pattern.test(text));
}
