/**
 * Speech-to-text provider — sends audio to the speech-to-text edge function.
 * Deepgram Nova-3 (primary) with keyterm prompting for player names + golf vocab.
 * OpenAI gpt-4o-mini-transcribe (fallback).
 * No client-side Web Speech API — voice requires internet.
 */

import { supabase } from '@/integrations/supabase/client';

export interface TranscriptResult {
  transcript: string;
  alternatives: string[];
  confidence: number;
}

/**
 * Detect the best audio recording format supported by this device.
 * Safari (iOS) uses audio/mp4, Chrome/Firefox use audio/webm.
 */
export function getPreferredMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

/**
 * Check if the device supports audio recording for voice features.
 */
export function isVoiceSupported(): boolean {
  return (
    typeof MediaRecorder !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    getPreferredMimeType() !== ''
  );
}

/**
 * Send recorded audio to the speech-to-text edge function for transcription.
 * The edge function handles provider selection (Deepgram → OpenAI fallback)
 * and keeps API keys server-side.
 */
export async function transcribeAudio(
  audioBlob: Blob,
  playerNames: string[] = [],
): Promise<TranscriptResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const url = `${supabaseUrl}/functions/v1/speech-to-text`;
  console.log('[SpeechProvider] POST', url, 'blob:', audioBlob.size, 'bytes, type:', audioBlob.type, 'players:', playerNames);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': audioBlob.type || 'audio/webm;codecs=opus',
      'X-Player-Names': playerNames.join(','),
      'apikey': apiKey,
    },
    body: audioBlob,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[SpeechProvider] Error response:', response.status, errorBody);
    let message = 'Transcription failed';
    try {
      const parsed = JSON.parse(errorBody);
      message = parsed.error || message;
    } catch {
      // use default message
    }
    throw new Error(message);
  }

  const result = await response.json();
  console.log('[SpeechProvider] Success:', result);
  return result;
}
