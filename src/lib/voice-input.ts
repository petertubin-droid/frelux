/**
 * Voice Input Hook — Web Speech API integration
 * Lets users speak dimension values instead of typing.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
}

interface UseVoiceInputResult {
  isListening: boolean;
  transcript: string | null;
  error: string | null;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  reset: () => void;
}

export function useVoiceInput(onResult?: (transcript: string) => void): UseVoiceInputResult {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const isSupported = typeof window !== 'undefined' &&
    (('SpeechRecognition' in window) || ('webkitSpeechRecognition' in window));

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Voice input is not supported in this browser.');
      return;
    }

    setError(null);
    setTranscript(null);

    const SpeechRecognitionClass = (window as unknown as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition || (window as unknown as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
    const recognition = new SpeechRecognitionClass();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (e: Event) => {
      setIsListening(false);
      if (e.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone access in your browser.');
      } else if (e.error === 'no-speech') {
        setError('No speech detected. Please try again.');
      } else {
        setError(`Voice input error: ${e.error}`);
      }
    };
    recognition.onresult = (e: Event) => {
      const result: SpeechRecognitionResult = {
        transcript: e.results[0][0].transcript,
        confidence: e.results[0][0].confidence,
      };
      setTranscript(result.transcript);
      if (onResult) onResult(result.transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, onResult]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  const reset = useCallback(() => {
    setTranscript(null);
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  return { isListening, transcript, error, isSupported, startListening, stopListening, reset };
}

/**
 * Parse a spoken phrase into a number.
 * Handles "three point five meters" → 3.5, "four feet" → 4, "twelve" → 12, etc.
 */
export function parseSpokenNumber(transcript: string): number | null {
  const lower = transcript.toLowerCase().trim();

  // Direct number match (e.g., "3.5", "12", "0.8")
  const directMatch = lower.match(/(\d+\.?\d*)/);
  if (directMatch) {
    return parseFloat(directMatch[1]);
  }

  // Word-to-number mapping
  const wordNumbers: Record<string, number> = {
    'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
    'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20,
    'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70,
    'eighty': 80, 'ninety': 90, 'hundred': 100,
    'point': -1, 'decimal': -1, 'dot': -1,
  };

  const words = lower.split(/\s+/);
  let result = 0;
  let current = 0;
  let decimalPart = false;
  let decimalDigits = '';

  for (const word of words) {
    // Clean the word
    const clean = word.replace(/[^a-z]/g, '');
    if (clean in wordNumbers) {
      const val = wordNumbers[clean];
      if (val === -1) {
        decimalPart = true;
      } else if (decimalPart) {
        decimalDigits += String(val);
      } else if (val >= 100) {
        current *= val;
      } else {
        current += val;
      }
    }
  }

  result = current;
  if (decimalPart && decimalDigits) {
    result = parseFloat(`${current}.${decimalDigits}`);
  }

  // Also try to find "point five" patterns
  const pointMatch = lower.match(/(\w+)\s+point\s+(\w+)/);
  if (pointMatch) {
    const whole = wordNumbers[pointMatch[1].replace(/[^a-z]/g, '')] ?? 0;
    const frac = wordNumbers[pointMatch[2].replace(/[^a-z]/g, '')] ?? 0;
    if (whole > 0) return parseFloat(`${whole}.${frac}`);
  }

  return result > 0 ? result : null;
}
