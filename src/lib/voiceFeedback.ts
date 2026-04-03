// Audio and haptic feedback for voice recognition
import { hapticSuccess, hapticError, hapticMedium, hapticLight } from './haptics';

// Webkit prefixed AudioContext (Safari)
interface WindowWithWebkit extends Window {
  webkitAudioContext?: typeof AudioContext;
}

// Audio context for playing sounds
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    const win = window as WindowWithWebkit;
    const AudioContextClass = window.AudioContext || win.webkitAudioContext;
    if (AudioContextClass) {
      audioContext = new AudioContextClass();
    } else {
      throw new Error('AudioContext not supported');
    }
  }
  return audioContext;
}

// Create and play a tone
function playTone(frequency: number, duration: number, volume: number = 0.2, type: OscillatorType = 'sine'): void {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch (error) {
    // Silently fail if audio not available
  }
}

// Play a chord (multiple notes)
function playChord(frequencies: number[], duration: number, volume: number = 0.15): void {
  frequencies.forEach(freq => playTone(freq, duration, volume / frequencies.length));
}

// === Feedback Functions ===

// Listening started - gentle "bloop" sound
export async function feedbackListeningStart(): Promise<void> {
  await hapticLight();
  playTone(440, 0.1, 0.15); // A4
  setTimeout(() => playTone(523, 0.1, 0.1), 80); // C5
}

// Listening stopped (processing)
export async function feedbackListeningStop(): Promise<void> {
  await hapticLight();
  playTone(523, 0.08, 0.1); // C5
}

// Voice recognized successfully - cheerful ascending arpeggio
export async function feedbackVoiceSuccess(): Promise<void> {
  await hapticSuccess();
  
  // Major chord arpeggio (C-E-G-C)
  playTone(523, 0.12, 0.15); // C5
  setTimeout(() => playTone(659, 0.12, 0.15), 60); // E5
  setTimeout(() => playTone(784, 0.12, 0.15), 120); // G5
  setTimeout(() => playTone(1047, 0.18, 0.12), 180); // C6
}

// All players scored - triumphant celebration
export async function feedbackAllScored(): Promise<void> {
  await hapticSuccess();
  
  // Major chord with flourish
  setTimeout(() => {
    playChord([523, 659, 784], 0.3, 0.2); // C major
  }, 100);
  setTimeout(() => {
    playChord([587, 740, 880], 0.4, 0.15); // D major higher
  }, 350);
}

// Voice parse failed - gentle "nope" sound
export async function feedbackVoiceError(): Promise<void> {
  await hapticError();
  
  // Descending minor interval
  playTone(440, 0.15, 0.12); // A4
  setTimeout(() => playTone(370, 0.2, 0.1), 120); // F#4
}

// Partial recognition - some but not all players
export async function feedbackVoicePartial(): Promise<void> {
  await hapticMedium();
  
  // Questioning sound
  playTone(392, 0.12, 0.12); // G4
  setTimeout(() => playTone(440, 0.15, 0.1), 100); // A4
}

// Auto-advance to next hole
export async function feedbackNextHole(): Promise<void> {
  await hapticMedium();
  
  // Whoosh/sweep sound
  playTone(262, 0.05, 0.08); // C4
  setTimeout(() => playTone(330, 0.05, 0.08), 30);
  setTimeout(() => playTone(392, 0.05, 0.08), 60);
  setTimeout(() => playTone(523, 0.12, 0.1), 90);
}

// Score saved (individual)
export async function feedbackScoreSaved(): Promise<void> {
  await hapticLight();
  playTone(659, 0.08, 0.1); // E5
}

// Wolf selection
export async function feedbackWolfSelected(): Promise<void> {
  await hapticMedium();
  
  // Dramatic wolf howl-like sound (minor key)
  playTone(220, 0.15, 0.12); // A3
  setTimeout(() => playTone(330, 0.2, 0.1), 100); // E4
}

// Press added
export async function feedbackPressAdded(): Promise<void> {
  await hapticMedium();

  // Cash register sound
  playTone(880, 0.08, 0.1);
  setTimeout(() => playTone(1047, 0.12, 0.1), 60);
}

// === Speech Synthesis ===

let speechEnabled = true;

export function setSpeechEnabled(enabled: boolean): void {
  speechEnabled = enabled;
}

export function isSpeechEnabled(): boolean {
  return speechEnabled;
}

function speak(text: string, options?: { rate?: number; pitch?: number; volume?: number }): Promise<void> {
  return new Promise((resolve) => {
    if (!speechEnabled || typeof window === 'undefined' || !window.speechSynthesis) {
      resolve();
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = options?.rate ?? 1.15;
    utterance.pitch = options?.pitch ?? 1.0;
    utterance.volume = options?.volume ?? 0.8;

    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.lang.startsWith('en') && (v.name.includes('Samantha') || v.name.includes('Karen') || v.name.includes('Daniel') || v.name.includes('Google'))
    ) || voices.find(v => v.lang.startsWith('en'));
    if (preferred) {
      utterance.voice = preferred;
    }

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    if (voices.length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        const v = window.speechSynthesis.getVoices();
        const pref = v.find(voice => voice.lang.startsWith('en'));
        if (pref) utterance.voice = pref;
        window.speechSynthesis.speak(utterance);
      };
    } else {
      window.speechSynthesis.speak(utterance);
    }

    setTimeout(resolve, 5000);
  });
}

/** Speak back confirmed scores: "Mike 4, Bob 5, saved" */
export async function speakScoreConfirmation(scores: Array<{ playerName: string; score: number }>): Promise<void> {
  if (!speechEnabled) return;
  const parts = scores.map(s => `${s.playerName.split(' ')[0]} ${s.score}`);
  const text = parts.length === 1
    ? `${parts[0]}, saved`
    : `${parts.join(', ')}, saved`;
  await speak(text, { rate: 1.2 });
}

/** Speak all-scored confirmation */
export async function speakAllScored(holeNumber: number): Promise<void> {
  if (!speechEnabled) return;
  await speak(`All scores saved for hole ${holeNumber}`, { rate: 1.15 });
}

/** Speak error */
export async function speakError(): Promise<void> {
  if (!speechEnabled) return;
  await speak("Didn't catch that, try again", { rate: 1.1 });
}

/** Speak a help prompt when user pauses */
export async function speakHelpPrompt(playerNames: string[]): Promise<void> {
  if (!speechEnabled) return;
  const names = playerNames.slice(0, 2).map(n => n.split(' ')[0]).join(' and ');
  await speak(`Say ${names} followed by their scores`, { rate: 1.0 });
}

/** Speak score query response */
export async function speakScoreQuery(playerName: string, score: number, holeNumber: number): Promise<void> {
  if (!speechEnabled) return;
  await speak(`${playerName.split(' ')[0]} got ${score} on hole ${holeNumber}`, { rate: 1.1 });
}

/** Speak missing players */
export async function speakMissingPlayers(playerNames: string[]): Promise<void> {
  if (!speechEnabled) return;
  const names = playerNames.map(n => n.split(' ')[0]);
  const text = names.length === 1
    ? `${names[0]} hasn't scored yet`
    : `${names.join(' and ')} haven't scored yet`;
  await speak(text, { rate: 1.1 });
}

/** Speak correction confirmation */
export async function speakCorrection(playerName: string, newScore: number): Promise<void> {
  if (!speechEnabled) return;
  await speak(`Changed ${playerName.split(' ')[0]} to ${newScore}`, { rate: 1.2 });
}

/** Speak navigation */
export async function speakNavigation(holeNumber: number, par?: number): Promise<void> {
  if (!speechEnabled) return;
  const text = par ? `Hole ${holeNumber}, par ${par}` : `Hole ${holeNumber}`;
  await speak(text, { rate: 1.15 });
}
