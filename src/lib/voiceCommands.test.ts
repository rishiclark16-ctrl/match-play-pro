import { describe, it, expect } from 'vitest';
import { parseVoiceCommands, hasScoreContent } from './voiceCommands';
import { GameConfig } from '@/types/golf';

const players = [
  { id: 'p1', name: 'Mike Johnson' },
  { id: 'p2', name: 'Bob Smith' },
  { id: 'p3', name: 'Tim Davis' },
  { id: 'p4', name: 'Adam Wilson' },
];

const noGames: GameConfig[] = [];
const wolfGame: GameConfig[] = [{ type: 'wolf', stake: 1 } as GameConfig];
const nassauGame: GameConfig[] = [{ type: 'nassau', stake: 5 } as GameConfig];

describe('parseVoiceCommands', () => {
  // === Existing navigation commands ===
  describe('navigation', () => {
    it('should parse "next hole"', () => {
      const commands = parseVoiceCommands('next hole', players, noGames);
      expect(commands.some(c => c.type === 'next_hole')).toBe(true);
    });

    it('should parse "previous hole"', () => {
      const commands = parseVoiceCommands('previous hole', players, noGames);
      expect(commands.some(c => c.type === 'previous_hole')).toBe(true);
    });

    it('should parse "go to hole 7"', () => {
      const commands = parseVoiceCommands('go to hole 7', players, noGames);
      const cmd = commands.find(c => c.type === 'go_to_hole');
      expect(cmd).toBeDefined();
      expect(cmd!.holeNumber).toBe(7);
    });

    it('should parse "hole 12"', () => {
      const commands = parseVoiceCommands('hole 12', players, noGames);
      const cmd = commands.find(c => c.type === 'go_to_hole');
      expect(cmd).toBeDefined();
      expect(cmd!.holeNumber).toBe(12);
    });

    it('should parse "move on"', () => {
      const commands = parseVoiceCommands('move on', players, noGames);
      expect(commands.some(c => c.type === 'next_hole')).toBe(true);
    });

    it('should parse "done with this hole"', () => {
      const commands = parseVoiceCommands('done with this hole', players, noGames);
      expect(commands.some(c => c.type === 'next_hole')).toBe(true);
    });
  });

  // === New: clear hole commands ===
  describe('clear hole', () => {
    it('should parse "clear all scores"', () => {
      const commands = parseVoiceCommands('clear all scores', players, noGames);
      expect(commands.some(c => c.type === 'clear_hole')).toBe(true);
    });

    it('should parse "undo everything on this hole"', () => {
      const commands = parseVoiceCommands('undo everything on this hole', players, noGames);
      expect(commands.some(c => c.type === 'clear_hole')).toBe(true);
    });

    it('should parse "reset this hole"', () => {
      const commands = parseVoiceCommands('reset this hole', players, noGames);
      expect(commands.some(c => c.type === 'clear_hole')).toBe(true);
    });

    it('should parse "start this hole over"', () => {
      const commands = parseVoiceCommands('start this hole over', players, noGames);
      expect(commands.some(c => c.type === 'clear_hole')).toBe(true);
    });

    it('should parse "erase scores"', () => {
      const commands = parseVoiceCommands('erase scores', players, noGames);
      expect(commands.some(c => c.type === 'clear_hole')).toBe(true);
    });
  });

  // === New: skip hole commands ===
  describe('skip hole', () => {
    it('should parse "skip this hole"', () => {
      const commands = parseVoiceCommands('skip this hole', players, noGames);
      expect(commands.some(c => c.type === 'skip_hole')).toBe(true);
    });

    it('should parse "mark as not played"', () => {
      const commands = parseVoiceCommands('mark as not played', players, noGames);
      expect(commands.some(c => c.type === 'skip_hole')).toBe(true);
    });

    it('should parse "didn\'t play this hole"', () => {
      const commands = parseVoiceCommands("didn't play this hole", players, noGames);
      expect(commands.some(c => c.type === 'skip_hole')).toBe(true);
    });
  });

  // === New: score queries ===
  describe('score queries', () => {
    it('should parse "what did Mike score"', () => {
      const commands = parseVoiceCommands('what did Mike score', players, noGames);
      const cmd = commands.find(c => c.type === 'query_score');
      expect(cmd).toBeDefined();
      expect(cmd!.queryPlayerId).toBe('p1');
      expect(cmd!.queryPlayerName).toBe('Mike Johnson');
    });

    it('should parse "what\'s Bob\'s score"', () => {
      const commands = parseVoiceCommands("what's Bob's score", players, noGames);
      const cmd = commands.find(c => c.type === 'query_score');
      expect(cmd).toBeDefined();
      expect(cmd!.queryPlayerId).toBe('p2');
    });

    it('should parse "how did Tim do"', () => {
      const commands = parseVoiceCommands('how did Tim do', players, noGames);
      const cmd = commands.find(c => c.type === 'query_score');
      expect(cmd).toBeDefined();
      expect(cmd!.queryPlayerId).toBe('p3');
    });
  });

  // === New: missing players query ===
  describe('missing players', () => {
    it('should parse "who hasn\'t scored"', () => {
      const commands = parseVoiceCommands("who hasn't scored", players, noGames);
      expect(commands.some(c => c.type === 'query_missing')).toBe(true);
    });

    it('should parse "who\'s left"', () => {
      const commands = parseVoiceCommands("who's left", players, noGames);
      expect(commands.some(c => c.type === 'query_missing')).toBe(true);
    });

    it('should parse "who needs to score"', () => {
      const commands = parseVoiceCommands('who needs to score', players, noGames);
      expect(commands.some(c => c.type === 'query_missing')).toBe(true);
    });

    it('should parse "anyone left"', () => {
      const commands = parseVoiceCommands('anyone left', players, noGames);
      expect(commands.some(c => c.type === 'query_missing')).toBe(true);
    });
  });

  // === New: par query ===
  describe('par query', () => {
    it('should parse "what\'s par"', () => {
      const commands = parseVoiceCommands("what's par", players, noGames);
      expect(commands.some(c => c.type === 'query_par')).toBe(true);
    });

    it('should parse "par on this hole"', () => {
      const commands = parseVoiceCommands('par on this hole', players, noGames);
      expect(commands.some(c => c.type === 'query_par')).toBe(true);
    });

    it('should parse "what is the par"', () => {
      const commands = parseVoiceCommands('what is the par', players, noGames);
      expect(commands.some(c => c.type === 'query_par')).toBe(true);
    });
  });

  // === New: leaderboard query ===
  describe('leaderboard query', () => {
    it('should parse "show me the leaderboard"', () => {
      const commands = parseVoiceCommands('show me the leaderboard', players, noGames);
      expect(commands.some(c => c.type === 'query_leaderboard')).toBe(true);
    });

    it('should parse "who\'s winning"', () => {
      const commands = parseVoiceCommands("who's winning", players, noGames);
      expect(commands.some(c => c.type === 'query_leaderboard')).toBe(true);
    });

    it('should parse "who\'s in the lead"', () => {
      const commands = parseVoiceCommands("who's in the lead", players, noGames);
      expect(commands.some(c => c.type === 'query_leaderboard')).toBe(true);
    });
  });

  // === New: game builder trigger ===
  describe('game builder', () => {
    it('should parse "start a new game"', () => {
      const commands = parseVoiceCommands('start a new game', players, noGames);
      expect(commands.some(c => c.type === 'start_game_builder')).toBe(true);
    });

    it('should parse "create a new bet"', () => {
      const commands = parseVoiceCommands('create a new bet', players, noGames);
      expect(commands.some(c => c.type === 'start_game_builder')).toBe(true);
    });

    it('should parse "set up a new game"', () => {
      const commands = parseVoiceCommands('set up a new game', players, noGames);
      expect(commands.some(c => c.type === 'start_game_builder')).toBe(true);
    });
  });

  // === New: hands-free toggle ===
  describe('hands-free toggle', () => {
    it('should parse "hands free on"', () => {
      const commands = parseVoiceCommands('hands free on', players, noGames);
      const cmd = commands.find(c => c.type === 'hands_free_toggle');
      expect(cmd).toBeDefined();
      expect(cmd!.enabled).toBe(true);
    });

    it('should parse "turn off hands free"', () => {
      const commands = parseVoiceCommands('turn off hands free', players, noGames);
      const cmd = commands.find(c => c.type === 'hands_free_toggle');
      expect(cmd).toBeDefined();
      expect(cmd!.enabled).toBe(false);
    });

    it('should parse "start continuous mode"', () => {
      const commands = parseVoiceCommands('start continuous mode', players, noGames);
      const cmd = commands.find(c => c.type === 'hands_free_toggle');
      expect(cmd).toBeDefined();
      expect(cmd!.enabled).toBe(true);
    });

    it('should parse "disable continuous listening"', () => {
      const commands = parseVoiceCommands('disable continuous listening', players, noGames);
      const cmd = commands.find(c => c.type === 'hands_free_toggle');
      expect(cmd).toBeDefined();
      expect(cmd!.enabled).toBe(false);
    });
  });

  // === New: speech toggle ===
  describe('speech toggle', () => {
    it('should parse "turn off speech"', () => {
      const commands = parseVoiceCommands('turn off speech', players, noGames);
      const cmd = commands.find(c => c.type === 'speech_toggle');
      expect(cmd).toBeDefined();
      expect(cmd!.enabled).toBe(false);
    });

    it('should parse "mute voice feedback"', () => {
      const commands = parseVoiceCommands('mute voice feedback', players, noGames);
      const cmd = commands.find(c => c.type === 'speech_toggle');
      expect(cmd).toBeDefined();
      expect(cmd!.enabled).toBe(false);
    });

    it('should parse "start talking"', () => {
      const commands = parseVoiceCommands('start talking', players, noGames);
      const cmd = commands.find(c => c.type === 'speech_toggle');
      expect(cmd).toBeDefined();
      expect(cmd!.enabled).toBe(true);
    });

    it('should parse "unmute voice"', () => {
      const commands = parseVoiceCommands('unmute voice', players, noGames);
      const cmd = commands.find(c => c.type === 'speech_toggle');
      expect(cmd).toBeDefined();
      expect(cmd!.enabled).toBe(true);
    });
  });

  // === Existing: Wolf commands ===
  describe('wolf commands', () => {
    it('should parse "Mike is the wolf"', () => {
      const commands = parseVoiceCommands('Mike is the wolf', players, wolfGame);
      const cmd = commands.find(c => c.type === 'wolf_selection');
      expect(cmd).toBeDefined();
      expect(cmd!.playerId).toBe('p1');
    });

    it('should parse "lone wolf"', () => {
      const commands = parseVoiceCommands('lone wolf', players, wolfGame);
      expect(commands.some(c => c.type === 'wolf_alone')).toBe(true);
    });

    it('should parse "pick Tim"', () => {
      const commands = parseVoiceCommands('pick Tim', players, wolfGame);
      const cmd = commands.find(c => c.type === 'wolf_partner');
      expect(cmd).toBeDefined();
      expect(cmd!.partnerId).toBe('p3');
    });

    it('should NOT parse wolf commands without wolf game', () => {
      const commands = parseVoiceCommands('Mike is the wolf', players, noGames);
      expect(commands.some(c => c.type === 'wolf_selection')).toBe(false);
    });
  });

  // === Existing: Nassau press ===
  describe('nassau commands', () => {
    it('should parse "press"', () => {
      const commands = parseVoiceCommands('press', players, nassauGame);
      expect(commands.some(c => c.type === 'press')).toBe(true);
    });

    it('should NOT parse press without nassau game', () => {
      const commands = parseVoiceCommands('press', players, noGames);
      expect(commands.some(c => c.type === 'press')).toBe(false);
    });
  });

  // === Existing: undo ===
  describe('undo commands', () => {
    it('should parse "undo"', () => {
      const commands = parseVoiceCommands('undo', players, noGames);
      expect(commands.some(c => c.type === 'undo')).toBe(true);
    });

    it('should parse "go back"', () => {
      const commands = parseVoiceCommands('go back', players, noGames);
      // go back matches both undo and previous_hole
      const hasUndo = commands.some(c => c.type === 'undo');
      const hasPrev = commands.some(c => c.type === 'previous_hole');
      expect(hasUndo || hasPrev).toBe(true);
    });
  });
});

describe('hasScoreContent', () => {
  it('should detect numbers', () => {
    expect(hasScoreContent('Mike 5')).toBe(true);
  });

  it('should detect golf terms', () => {
    expect(hasScoreContent('Mike birdie')).toBe(true);
    expect(hasScoreContent('par for everyone')).toBe(true);
  });

  it('should detect word numbers', () => {
    expect(hasScoreContent('Mike five')).toBe(true);
  });

  it('should detect "got a" patterns', () => {
    expect(hasScoreContent('Mike got a')).toBe(true);
  });

  it('should detect "shot a" patterns', () => {
    expect(hasScoreContent('Mike shot a')).toBe(true);
  });

  it('should reject pure navigation commands', () => {
    expect(hasScoreContent('next hole')).toBe(false);
  });

  it('should reject greetings', () => {
    expect(hasScoreContent('hello')).toBe(false);
  });
});
