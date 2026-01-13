interface Player {
  id: string;
  name: string;
}

export interface ParsedScore {
  playerId: string;
  playerName: string;
  score: number;
}

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ParseResult {
  success: boolean;
  scores: ParsedScore[];
  unrecognized: string[];
  rawTranscript: string;
  confidence: ConfidenceLevel;
  confidenceReason: string;
}

// Word numbers to digits - comprehensive with common mishearings
const wordToNumber: Record<string, number> = {
  // Standard words
  'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'eleven': 11, 'twelve': 12,
  // Common mishearings
  'won': 1, 'want': 1, 'juan': 1,
  'to': 2, 'too': 2, 'tu': 2,
  'tree': 3, 'free': 3, 'treat': 3,
  'for': 4, 'fore': 4, 'floor': 4, 'ford': 4,
  'fives': 5, 'hive': 5, 'dive': 5,
  'sex': 6, 'sax': 6, 'sits': 6,
  'heaven': 7, 'evan': 7,
  'ate': 8, 'weight': 8, 'wait': 8, 'late': 8,
  'nein': 9, 'dine': 9, 'fine': 9, 'line': 9, 'mine': 9, 'wine': 9,
  // Ordinal variations
  'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5,
};

// Common phonetic variations for names - expanded
const phoneticVariations: Record<string, string[]> = {
  'michael': ['mike', 'mikey', 'mick', 'micah', 'my call', 'micheal'],
  'william': ['will', 'bill', 'billy', 'willy', 'liam'],
  'robert': ['rob', 'bob', 'bobby', 'robby', 'bert', 'robbie'],
  'richard': ['rick', 'dick', 'rich', 'ricky', 'richie'],
  'jonathan': ['jon', 'john', 'johnny', 'jonny', 'nathan'],
  'james': ['jim', 'jimmy', 'jamie', 'jay'],
  'timothy': ['tim', 'timmy'],
  'anthony': ['tony', 'ant', 'anton', 'antony'],
  'nicholas': ['nick', 'nicky', 'nico', 'nickolas'],
  'christopher': ['chris', 'kris', 'topher', 'kit'],
  'matthew': ['matt', 'matty', 'mathew'],
  'daniel': ['dan', 'danny', 'daniels'],
  'andrew': ['andy', 'drew', 'andre'],
  'steven': ['steve', 'stevie', 'stephen'],
  'david': ['dave', 'davey', 'davie'],
  'thomas': ['tom', 'tommy', 'thom'],
  'patrick': ['pat', 'paddy', 'patty', 'patric'],
  'edward': ['ed', 'eddie', 'ted', 'teddy', 'ned'],
  'alexander': ['alex', 'xander', 'al', 'lex', 'alec'],
  'benjamin': ['ben', 'benny', 'benji'],
  'joshua': ['josh', 'joshy'],
  'adam': ['ad', 'addison', 'atom'],
  'austin': ['aus', 'aussie'],
  'jack': ['jacky', 'jackie', 'jaq'],
  'joseph': ['joe', 'joey', 'jo'],
  'samuel': ['sam', 'sammy'],
  'ryan': ['ry'],
  'kyle': ['ky'],
  'brian': ['bri', 'bryan'],
  'kevin': ['kev'],
  'jason': ['jay', 'jase'],
  'justin': ['just'],
  'brandon': ['brand'],
  'zachary': ['zach', 'zack', 'zak'],
  'tyler': ['ty'],
  'jacob': ['jake', 'jakey'],
  'connor': ['con'],
  'sean': ['shawn', 'shaun'],
  'charles': ['charlie', 'chuck', 'chas'],
  'peter': ['pete', 'petey'],
  'paul': ['paulie'],
  'mark': ['marky'],
  'frank': ['franky', 'frankie'],
  'george': ['georgie'],
  'henry': ['hank', 'harry'],
  'larry': ['lar', 'lars'],
  'gary': ['gar'],
  'dennis': ['den', 'denny'],
  'raymond': ['ray'],
  'donald': ['don', 'donny'],
  'gerald': ['jerry', 'gerry'],
  'douglas': ['doug', 'dougie'],
  'gregory': ['greg', 'gregg'],
  'lawrence': ['larry', 'lars', 'lary'],
  'phillip': ['phil'],
  'ronald': ['ron', 'ronny', 'ronnie'],
  'russell': ['russ', 'rusty'],
  'walter': ['walt', 'wally'],
  'albert': ['al', 'bert'],
  'arthur': ['art', 'artie'],
  'carl': ['carlos'],
  'eugene': ['gene'],
  'ralph': ['ralf'],
  'louis': ['lou', 'louie'],
  'vincent': ['vin', 'vinny', 'vince'],
  'wayne': ['wane'],
  'roger': ['rodge'],
  'eric': ['rick', 'erik'],
};

// Golf terms to relative par - expanded with more variations
const golfTerms: Record<string, number> = {
  // Standard terms
  'ace': -3,
  'hole in one': -3,
  'albatross': -3,
  'double eagle': -3,
  'eagle': -2,
  'birdie': -1,
  'par': 0,
  // Bogey variations
  'bogey': 1, 'bogie': 1, 'bogy': 1, 'boggie': 1, 'bogi': 1, 'boogie': 1,
  // Double bogey variations
  'double': 2, 'double bogey': 2, 'double bogie': 2, 'dub': 2,
  // Triple bogey variations
  'triple': 3, 'triple bogey': 3, 'triple bogie': 3, 'trip': 3,
  'quad': 4, 'quadruple': 4, 'quadruple bogey': 4,
  // Slang
  'snowman': 8,
  'other': 0, // placeholder, ignored
};

// Calculate Levenshtein distance for fuzzy matching
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

// Check if two strings are similar enough (fuzzy match)
function isFuzzyMatch(input: string, target: string, threshold: number = 2): boolean {
  const inputLower = input.toLowerCase();
  const targetLower = target.toLowerCase();
  
  // Exact match
  if (inputLower === targetLower) return true;
  
  // One is substring of the other (for partial names)
  if (inputLower.includes(targetLower) || targetLower.includes(inputLower)) return true;
  
  // For short strings, be stricter
  if (target.length <= 3) {
    return levenshteinDistance(inputLower, targetLower) <= 1;
  }
  
  // For longer strings, allow more variation
  const maxDistance = Math.min(threshold, Math.floor(target.length / 3));
  return levenshteinDistance(inputLower, targetLower) <= maxDistance;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,!?'"-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract potential name-like words from text
function extractPotentialNames(text: string): string[] {
  const words = text.split(/\s+/);
  const potentialNames: string[] = [];
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    // Single word (potential first name)
    if (word.length >= 2) {
      potentialNames.push(word);
    }
    // Two consecutive words (potential full name)
    if (i < words.length - 1) {
      potentialNames.push(`${word} ${words[i + 1]}`);
    }
  }
  
  return potentialNames;
}

function findPlayerMatch(text: string, players: Player[]): Player | null {
  const normalizedText = normalizeText(text);
  const potentialNames = extractPotentialNames(normalizedText);
  
  // First pass: exact matches (full name, first name, last name)
  for (const player of players) {
    const playerNameLower = player.name.toLowerCase();
    const nameParts = playerNameLower.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];
    
    // Check exact full name
    if (normalizedText.includes(playerNameLower)) {
      return player;
    }
    
    // Check exact first name or last name with word boundary
    for (const potential of potentialNames) {
      if (potential === firstName || (nameParts.length > 1 && potential === lastName)) {
        return player;
      }
    }
  }
  
  // Second pass: nickname/phonetic variations
  for (const player of players) {
    const playerNameLower = player.name.toLowerCase();
    const firstName = playerNameLower.split(' ')[0];
    
    // Build all variants for this player
    const allVariants: string[] = [firstName];
    
    // Check if first name matches any known full name
    Object.entries(phoneticVariations).forEach(([full, nicks]) => {
      if (firstName === full) {
        allVariants.push(...nicks);
      }
      // Check if first name IS a nickname of something
      nicks.forEach(nick => {
        if (firstName === nick || isFuzzyMatch(firstName, nick)) {
          allVariants.push(full, ...nicks.filter(n => n !== nick));
        }
      });
    });
    
    // Check each variant
    for (const variant of allVariants) {
      for (const potential of potentialNames) {
        if (potential === variant || isFuzzyMatch(potential, variant)) {
          return player;
        }
      }
    }
  }
  
  // Third pass: fuzzy match on player names directly
  for (const player of players) {
    const firstName = player.name.toLowerCase().split(' ')[0];
    
    for (const potential of potentialNames) {
      // Only fuzzy match if the input is similar to the name
      if (isFuzzyMatch(potential, firstName, 2)) {
        return player;
      }
    }
  }
  
  return null;
}

function calculateConfidence(
  scores: ParsedScore[],
  players: Player[],
  unrecognized: string[]
): { level: ConfidenceLevel; reason: string } {
  if (scores.length === 0) {
    return { level: 'low', reason: 'No scores parsed' };
  }
  
  const coverage = scores.length / players.length;
  const meaningfulUnrecognized = unrecognized.filter(u => 
    u.length > 3 && 
    !['and', 'the', 'got', 'had', 'made', 'shot', 'scored', 'with', 'for'].includes(u.toLowerCase())
  );
  
  // High confidence: all players have scores and no meaningful unrecognized content
  if (coverage === 1 && meaningfulUnrecognized.length === 0) {
    return { level: 'high', reason: 'All players matched' };
  }
  
  // High confidence: 75%+ players matched with minimal unrecognized content
  if (coverage >= 0.75 && meaningfulUnrecognized.length === 0) {
    return { level: 'high', reason: `${scores.length} of ${players.length} players matched` };
  }
  
  // Medium confidence: some players matched
  if (coverage >= 0.5) {
    return { level: 'medium', reason: `${scores.length} of ${players.length} players matched` };
  }
  
  // Medium confidence: at least one player matched with good content
  if (scores.length >= 1 && meaningfulUnrecognized.length <= 1) {
    return { level: 'medium', reason: `${scores.length} player${scores.length > 1 ? 's' : ''} matched` };
  }
  
  // Low confidence
  return { level: 'low', reason: meaningfulUnrecognized.length > 0 ? 'Some content unrecognized' : 'Few players matched' };
}

function extractScore(text: string, par: number): number | null {
  const normalizedText = normalizeText(text);
  
  // Check for compound golf terms first (longer phrases take precedence)
  const compoundTerms = [
    { pattern: /double\s+bogey|double\s+bogie|dub\s+bog/i, score: par + 2 },
    { pattern: /triple\s+bogey|triple\s+bogie|trip\s+bog/i, score: par + 3 },
    { pattern: /quadruple\s+bogey|quad\s+bog/i, score: par + 4 },
    { pattern: /hole\s+in\s+one|hole-in-one/i, score: 1 },
    { pattern: /double\s+eagle/i, score: par - 3 },
  ];
  
  for (const { pattern, score } of compoundTerms) {
    if (pattern.test(normalizedText)) {
      if (score >= 1 && score <= 15) {
        return score;
      }
    }
  }
  
  // Check for single golf terms
  for (const [term, relative] of Object.entries(golfTerms)) {
    if (term === 'other') continue;
    // Use word boundary for single-word terms
    const regex = new RegExp(`\\b${term}\\b`, 'i');
    if (regex.test(normalizedText)) {
      const score = par + relative;
      if (score >= 1 && score <= 15) {
        return score;
      }
    }
  }
  
  // Try direct number match - prioritize numbers that make sense for golf
  const numberMatches = normalizedText.match(/\b(\d{1,2})\b/g);
  if (numberMatches) {
    for (const numStr of numberMatches) {
      const num = parseInt(numStr, 10);
      if (num >= 1 && num <= 15) {
        return num;
      }
    }
  }
  
  // Try word numbers - be more flexible with matching
  const words = normalizedText.split(/\s+/);
  for (const word of words) {
    // Exact match
    if (wordToNumber[word] !== undefined) {
      const num = wordToNumber[word];
      if (num >= 1 && num <= 12) {
        return num;
      }
    }
    // Fuzzy match for word numbers
    for (const [numWord, num] of Object.entries(wordToNumber)) {
      if (isFuzzyMatch(word, numWord, 1) && num >= 1 && num <= 12) {
        return num;
      }
    }
  }
  
  return null;
}

// Parse patterns like "Name Score" or "Name got/made/had Score"
function parseNameScorePatterns(text: string, players: Player[], currentPar: number): ParsedScore[] {
  const scores: ParsedScore[] = [];
  const processedPlayerIds = new Set<string>();
  
  // Patterns to match: "Name Number", "Name got/made/had Number", "Number for Name"
  const patterns = [
    // "Adam got a 5", "Mike made 4", "John had a birdie"
    /(\b\w+\b)\s+(?:got|made|had|shot|scored|took|carded)\s+(?:a\s+)?(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|par|birdie|bogey|bogie|eagle|double|triple)/gi,
    // "Adam 5", "Mike four"
    /(\b\w+\b)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|par|birdie|bogey|bogie|eagle|double|triple)(?:\s|$|,)/gi,
    // "5 for Adam", "birdie for Mike"
    /(\d+|one|two|three|four|five|six|seven|eight|nine|ten|par|birdie|bogey|bogie|eagle|double|triple)\s+(?:for|from)\s+(\b\w+\b)/gi,
  ];
  
  for (const pattern of patterns) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    
    while ((match = regex.exec(text)) !== null) {
      let nameWord: string;
      let scoreWord: string;
      
      if (match[0].includes('for') || match[0].includes('from')) {
        // "5 for Adam" pattern
        scoreWord = match[1];
        nameWord = match[2];
      } else {
        // "Adam 5" or "Adam got 5" pattern
        nameWord = match[1];
        scoreWord = match[2];
      }
      
      const player = findPlayerMatch(nameWord, players);
      
      if (player && !processedPlayerIds.has(player.id)) {
        const score = extractScore(scoreWord, currentPar);
        
        if (score) {
          scores.push({
            playerId: player.id,
            playerName: player.name,
            score,
          });
          processedPlayerIds.add(player.id);
        }
      }
    }
  }
  
  return scores;
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
  
  // Handle "all fours", "all fives", "everybody got", etc.
  const allPatterns = [
    /\ball\s+(fours?|fives?|sixes?|sevens?|eights?|threes?|twos?|ones?|nines?|tens?)\b/i,
    /\ball\s+(pars?|bogeys?|bogies?|birdies?|eagles?|doubles?|triples?)\b/i,
    /\beverybody\s+(?:got|made|had|shot)\s+(?:a\s+)?(\d+|one|two|three|four|five|six|seven|eight|nine|ten|par|birdie|bogey|bogie|eagle|double|triple)\b/i,
    /\beveryone\s+(?:got|made|had|shot)\s+(?:a\s+)?(\d+|one|two|three|four|five|six|seven|eight|nine|ten|par|birdie|bogey|bogie|eagle|double|triple)\b/i,
    /\bsame\s+(?:score\s+)?(?:for\s+)?(?:all|everybody|everyone)\s*[:\-]?\s*(\d+|one|two|three|four|five|six|seven|eight|nine|ten|par|birdie|bogey|bogie)\b/i,
  ];
  
  for (const pattern of allPatterns) {
    const allMatch = text.match(pattern);
    if (allMatch) {
      const word = allMatch[1].replace(/s$/, '').toLowerCase();
      let score: number | null = null;
      
      const numberMap: Record<string, number> = {
        'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
        'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
      };
      
      if (numberMap[word]) {
        score = numberMap[word];
      } else if (word === 'par') {
        score = currentPar;
      } else if (word === 'birdie') {
        score = currentPar - 1;
      } else if (word === 'bogey' || word === 'bogie') {
        score = currentPar + 1;
      } else if (word === 'eagle') {
        score = currentPar - 2;
      } else if (word === 'double') {
        score = currentPar + 2;
      } else if (word === 'triple') {
        score = currentPar + 3;
      } else if (wordToNumber[word]) {
        score = wordToNumber[word];
      } else {
        // Try to extract from digit
        const digitMatch = allMatch[1].match(/\d+/);
        if (digitMatch) {
          score = parseInt(digitMatch[0], 10);
        }
      }
      
      if (score && score >= 1 && score <= 15) {
        players.forEach(player => {
          scores.push({
            playerId: player.id,
            playerName: player.name,
            score,
          });
          processedPlayerIds.add(player.id);
        });
        return { 
          success: true, 
          scores, 
          unrecognized, 
          rawTranscript: transcript, 
          confidence: 'high', 
          confidenceReason: 'All players scored same' 
        };
      }
    }
  }
  
  // Try structured patterns first
  const patternScores = parseNameScorePatterns(text, players, currentPar);
  for (const ps of patternScores) {
    if (!processedPlayerIds.has(ps.playerId)) {
      scores.push(ps);
      processedPlayerIds.add(ps.playerId);
    }
  }
  
  // Split by common separators and try each segment
  const segments = text
    .split(/[,.]|\band\b|\bthen\b|\balso\b|\bwhile\b|\bwith\b/)
    .map(s => s.trim())
    .filter(s => s.length > 2);
  
  for (const segment of segments) {
    // Skip if we already processed via patterns
    const alreadyHasPlayer = players.some(p => 
      processedPlayerIds.has(p.id) && 
      segment.toLowerCase().includes(p.name.toLowerCase().split(' ')[0])
    );
    if (alreadyHasPlayer) continue;
    
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
        // Found player but no score - mark as unrecognized
        unrecognized.push(segment);
      }
    } else if (!player && segment.length > 3) {
      // No player found, check if it's meaningful content
      const hasScore = extractScore(segment, currentPar);
      if (!hasScore) {
        const isCommonWord = ['the', 'and', 'got', 'had', 'made', 'shot', 'scored'].some(w => 
          segment.toLowerCase() === w
        );
        if (!isCommonWord) {
          unrecognized.push(segment);
        }
      }
    }
  }
  
  // If we still have unprocessed players, try a more aggressive parse
  const unprocessedPlayers = players.filter(p => !processedPlayerIds.has(p.id));
  if (unprocessedPlayers.length > 0 && scores.length < players.length) {
    // Try finding any remaining player mentions in the full text
    for (const player of unprocessedPlayers) {
      const firstName = player.name.toLowerCase().split(' ')[0];
      
      // Look for the player name followed by any number
      const regex = new RegExp(
        `\\b${firstName}\\b.*?\\b(\\d+|${Object.keys(wordToNumber).join('|')}|${Object.keys(golfTerms).filter(t => t !== 'other').join('|')})\\b`,
        'i'
      );
      const match = text.match(regex);
      
      if (match) {
        const score = extractScore(match[0], currentPar);
        if (score) {
          scores.push({
            playerId: player.id,
            playerName: player.name,
            score,
          });
          processedPlayerIds.add(player.id);
        }
      }
    }
  }
  
  const filteredUnrecognized = unrecognized.filter(u => 
    u.length > 2 && 
    !['and', 'the', 'got', 'had', 'made', 'shot', 'scored', 'with', 'for', 'a'].includes(u.toLowerCase())
  );
  const { level, reason } = calculateConfidence(scores, players, filteredUnrecognized);
  
  return {
    success: scores.length > 0,
    scores,
    unrecognized: filteredUnrecognized,
    rawTranscript: transcript,
    confidence: level,
    confidenceReason: reason,
  };
}
