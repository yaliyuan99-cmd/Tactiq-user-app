import { useId, type ReactNode } from 'react';
import { Vibrate, Volume2 } from 'lucide-react';
import { Button } from '@/components';
import { useFeedback } from '@/services/feedback/FeedbackProvider';
import { VIBRATION_PATTERNS } from '@/services/feedback/types';

export const SPEECH_SAMPLE_TEXT = 'Next.';
export const CANNOT_SPEAK_NOTE = 'This browser cannot speak aloud.';
export const CANNOT_VIBRATE_NOTE = 'This browser or device does not allow vibration (for example, Safari on iPhone).';
export const VIBRATION_REQUESTED = 'Asked this phone to vibrate once.';
export const VIBRATION_REFUSED = 'The browser did not vibrate this time.';

interface TryoutProps {
  /** The matching preference is on, so the browser will act on the request. */
  readonly enabled: boolean;
}

function TryoutRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-x-4 gap-y-2">{children}</div>;
}

/** "Play a sample": speaks one command name with the browser's voice. */
export function SpeechSample({ enabled }: TryoutProps) {
  const { speak, canSpeak } = useFeedback();
  const hintId = `speech-sample-${useId().replace(/:/g, '')}`;
  if (!canSpeak) return <p className="text-sm text-muted-foreground">{CANNOT_SPEAK_NOTE}</p>;
  return (
    <TryoutRow>
      <Button
        variant="secondary"
        size="sm"
        leadingIcon={<Volume2 className="h-4 w-4" />}
        aria-disabled={!enabled || undefined}
        aria-describedby={enabled ? undefined : hintId}
        onClick={() => speak(SPEECH_SAMPLE_TEXT)}
      >
        Play a sample
      </Button>
      {!enabled && (
        <p id={hintId} className="text-sm text-muted-foreground">
          Switch on audio announcements to hear a sample.
        </p>
      )}
    </TryoutRow>
  );
}

/** "Try a vibration": one short pulse, the stand-in for the ring's confirm haptic. Always announced in words too. */
export function VibrationSample({ enabled }: TryoutProps) {
  const { vibrate, announce, canVibrate } = useFeedback();
  const hintId = `vibration-sample-${useId().replace(/:/g, '')}`;
  if (!canVibrate) return <p className="text-sm text-muted-foreground">{CANNOT_VIBRATE_NOTE}</p>;
  return (
    <TryoutRow>
      <Button
        variant="secondary"
        size="sm"
        leadingIcon={<Vibrate className="h-4 w-4" />}
        aria-disabled={!enabled || undefined}
        aria-describedby={enabled ? undefined : hintId}
        onClick={() => announce(vibrate(VIBRATION_PATTERNS.confirm) ? VIBRATION_REQUESTED : VIBRATION_REFUSED)}
      >
        Try a vibration
      </Button>
      {!enabled && (
        <p id={hintId} className="text-sm text-muted-foreground">
          Switch on haptic feedback to try a vibration.
        </p>
      )}
    </TryoutRow>
  );
}
