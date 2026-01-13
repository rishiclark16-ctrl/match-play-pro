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
  | 'score_entry';

export interface VoiceCommand {
  type: VoiceCommandType;
  playerId?: string;
  playerName?: string;
  partnerId?: string;
  partnerName?: string;
  holeNumber?: number;
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[.,!?]/g, '').replace(/\s+/g, ' ').trim();
}

function findPlayerInText(text: string, players: Player[]): Player | null {
  const normalized = normalizeText(text);
  
  for (const player of players) {
    const playerLower = player.name.toLowerCase();
    const firstName = playerLower.split(' ')[0];
    const lastName = playerLower.split(' ').pop() || '';
    
    // Check for phonetic/common variations
    const nicknames: Record<string, string[]> = {
      'michael': ['mike', 'mikey'],
      'william': ['will', 'bill', 'billy'],
      'robert': ['rob', 'bob', 'bobby'],
      'richard': ['rick', 'dick', 'rich'],
      'jonathan': ['jon', 'john', 'johnny'],
      'james': ['jim', 'jimmy'],
      'timothy': ['tim', 'timmy'],
      'anthony': ['tony', 'ant'],
      'nicholas': ['nick', 'nicky'],
      'christopher': ['chris'],
      'matthew': ['matt'],
      'daniel': ['dan', 'danny'],
      'andrew': ['andy', 'drew'],
      'adam': ['ad'],
      'austin': ['aus'],
      'jack': ['jacky'],
    };
    
    // Check full name, first name, last name
    if (
      normalized.includes(playerLower) ||
      normalized.includes(firstName) ||
      (lastName !== firstName && normalized.includes(lastName))
    ) {
      return player;
    }
    
    // Check nicknames
    const allVariants = [firstName, lastName];
    Object.entries(nicknames).forEach(([full, nicks]) => {
      if (firstName === full) allVariants.push(...nicks);
      nicks.forEach(nick => {
        if (firstName === nick) allVariants.push(full);
      });
    });
    
    for (const variant of allVariants) {
      const regex = new RegExp(`\\b${variant}\\b`, 'i');
      if (regex.test(normalized)) {
        return player;
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
    // "Jack is the wolf" / "wolf is Jack"
    const wolfMatch = text.match(/(\w+)\s+is\s+(?:the\s+)?wolf|wolf\s+is\s+(\w+)/i);
    if (wolfMatch) {
      const nameWord = wolfMatch[1] || wolfMatch[2];
      const player = findPlayerInText(nameWord, players);
      if (player) {
        commands.push({
          type: 'wolf_selection',
          playerId: player.id,
          playerName: player.name,
        });
      }
    }
    
    // "Wolf goes alone" / "going alone" / "lone wolf"
    if (/wolf\s+(?:goes?\s+)?alone|going\s+alone|lone\s+wolf/i.test(text)) {
      commands.push({ type: 'wolf_alone' });
    }
    
    // "Jack picked Tim" / "wolf picks Tim" / "Jack partners with Tim"
    const partnerMatch = text.match(
      /(\w+)\s+(?:picked|picks|chose|chooses|partners?\s+with)\s+(\w+)/i
    );
    if (partnerMatch) {
      const wolf = findPlayerInText(partnerMatch[1], players);
      const partner = findPlayerInText(partnerMatch[2], players);
      if (wolf && partner && wolf.id !== partner.id) {
        commands.push({
          type: 'wolf_partner',
          playerId: wolf.id,
          playerName: wolf.name,
          partnerId: partner.id,
          partnerName: partner.name,
        });
      }
    }
  }
  
  // Press commands for Nassau
  const hasNassau = games.some(g => g.type === 'nassau');
  if (hasNassau && /press(?:es)?|pressing/i.test(text)) {
    commands.push({ type: 'press' });
  }
  
  // Navigation commands
  if (/next\s+hole|move\s+(?:to\s+)?next|forward|onwards?/i.test(text)) {
    commands.push({ type: 'next_hole' });
  }
  
  if (/previous\s+hole|go\s+back|back\s+(?:a\s+)?hole|last\s+hole/i.test(text)) {
    commands.push({ type: 'previous_hole' });
  }
  
  // Go to specific hole
  const holeMatch = text.match(/(?:go\s+to|hole)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen)/i);
  if (holeMatch) {
    const wordToNum: Record<string, number> = {
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
      'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14,
      'fifteen': 15, 'sixteen': 16, 'seventeen': 17, 'eighteen': 18,
    };
    const holeNum = parseInt(holeMatch[1]) || wordToNum[holeMatch[1].toLowerCase()];
    if (holeNum >= 1 && holeNum <= 18) {
      commands.push({ type: 'next_hole', holeNumber: holeNum });
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
  ];
  
  return scorePatterns.some(pattern => pattern.test(text));
}
