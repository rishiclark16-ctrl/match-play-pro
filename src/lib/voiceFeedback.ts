// Audio and haptic feedback for voice recognition
import { hapticSuccess, hapticError, hapticMedium, hapticLight } from './haptics';

// Audio context for playing sounds
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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
