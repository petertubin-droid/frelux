import { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useVoiceInput, parseSpokenNumber } from '@/lib/voice-input';
import { classNames } from '@/lib/utils';
import { Button } from "@/components/ui/shadcn/button";

interface VoiceInputButtonProps {
  onResult: (value: number) => void;
  label?: string;
  compact?: boolean;
}

export function VoiceInputButton({ onResult, label, compact = true }: VoiceInputButtonProps) {
  const [feedback, setFeedback] = useState<string | null>(null);

  const { isListening, isSupported, error, startListening, stopListening } = useVoiceInput((transcript) => {
    const num = parseSpokenNumber(transcript);
    if (num !== null && num > 0) {
      onResult(num);
      setFeedback(`Heard: ${transcript} → ${num}`);
    } else {
      setFeedback(`Heard: "${transcript}", couldn't parse a number`);
    }
    setTimeout(() => setFeedback(null), 3000);
  });

  if (!isSupported) return null;

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        onClick={isListening ? stopListening : startListening}
        className={classNames(
          'inline-flex items-center justify-center rounded-lg border transition-all',
          compact ? 'h-8 w-8' : 'gap-1.5 px-3 py-1.5 text-sm font-medium',
          isListening
            ? 'border-red-300 bg-red-50 text-red-600 animate-pulse dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400'
            : 'border-border text-muted-foreground hover:border-brand-purple/30 hover:text-brand-purple dark:border-border border-border dark:text-muted-foreground',
        )}
        aria-label={isListening ? 'Stop voice input' : `Speak ${label ?? 'value'}`}
        title={isListening ? 'Listening...' : `Speak ${label ?? 'value'}`}
      >
        {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        {!compact && <span>{isListening ? 'Stop' : 'Speak'}</span>}
      </Button>
      {feedback && (
        <span className="text-xs text-muted-foreground dark:text-muted-foreground">{feedback}</span>
      )}
      {error && (
        <span className="text-xs text-red-500">{error}</span>
      )}
    </div>
  );
}
