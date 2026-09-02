/**
 * Voice Input Component — Web Speech API speech-to-text
 *
 * Features:
 * - Uses browser-native SpeechRecognition when available
 * - Gracefully detects unsupported browsers
 * - Always provides normal text input as fallback
 * - Handles microphone permission denial
 * - User can edit transcribed text before saving
 * - Does not store audio recordings
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Square } from "lucide-react";

interface VoiceInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  multiline?: boolean;
  className?: string;
}

// Minimal type declarations for the Web Speech API (not in standard TS lib)
interface SpeechRecognitionEvent extends Event {
  results: {
    length: number;
    [index: number]: {
      length: number;
      [index: number]: { transcript: string; confidence: number };
      isFinal: boolean;
    };
  };
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface ISpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

function getSpeechRecognition(): (new () => ISpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  const SR =
    (
      window as unknown as {
        SpeechRecognition?: new () => ISpeechRecognition;
        webkitSpeechRecognition?: new () => ISpeechRecognition;
      }
    ).SpeechRecognition ??
    (
      window as unknown as {
        webkitSpeechRecognition?: new () => ISpeechRecognition;
      }
    ).webkitSpeechRecognition;
  return SR ?? null;
}

export function VoiceInput({
  value,
  onChange,
  placeholder,
  label,
  multiline = false,
  className = "",
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const valueRef = useRef(value);

  // Keep ref in sync
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    const SR = getSpeechRecognition();
    setIsSupported(SR !== null);
  }, []);

  const startListening = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR) {
      setError(
        "Voice input is not supported in your browser. Please type instead.",
      );
      return;
    }

    setError(null);
    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        // Append to existing text
        const current = valueRef.current;
        const separator = current && !current.endsWith(" ") ? " " : "";
        onChange(current + separator + finalTranscript.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        setError(
          "Microphone access denied. Please allow microphone permissions in your browser settings.",
        );
      } else if (event.error === "no-speech") {
        setError("No speech detected. Please try again.");
      } else if (event.error === "network") {
        setError(
          "Network error during speech recognition. Please check your connection.",
        );
      } else {
        setError(
          `Voice input error: ${event.error}. Please try typing instead.`,
        );
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [onChange]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          /* cleanup on unmount */
        }
      }
    };
  }, []);

  const handleButtonClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className={className}>
      {label && (
        <label className="mb-1 block text-sm font-medium text-card-foreground dark:text-muted-foreground/80">
          {label}
        </label>
      )}
      <div className="flex items-start gap-2">
        {multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={3}
            className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-purple focus:ring-1 focus:ring-brand-purple dark:border-white/10 dark:bg-white/5 dark:text-primary-foreground dark:placeholder:text-muted-foreground"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-purple focus:ring-1 focus:ring-brand-purple dark:border-white/10 dark:bg-white/5 dark:text-primary-foreground dark:placeholder:text-muted-foreground"
          />
        )}
        {isSupported && (
          <button
            type="button"
            onClick={handleButtonClick}
            className={`shrink-0 rounded-lg p-2 transition-colors ${
              isListening
                ? "bg-red-500 text-primary-foreground hover:bg-red-600"
                : "bg-primary/10 text-brand-purple hover:bg-primary/20"
            }`}
            title={isListening ? "Stop voice input" : "Start voice input"}
            aria-label={isListening ? "Stop voice input" : "Start voice input"}
          >
            {isListening ? (
              <Square className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
      {!isSupported && (
        <p className="mt-1 text-xs text-muted-foreground">
          Voice input not supported in this browser. Type normally.
        </p>
      )}
      {isListening && (
        <p className="mt-1 flex items-center gap-1 text-xs text-brand-purple">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
          Listening… Tap stop when done.
        </p>
      )}
    </div>
  );
}
