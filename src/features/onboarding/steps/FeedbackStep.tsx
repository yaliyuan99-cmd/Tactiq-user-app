import { useState } from 'react';
import { Vibrate, Volume2 } from 'lucide-react';
import { Button, EvidenceLabel } from '@/components';
import { useFeedback } from '@/services/feedback/FeedbackProvider';
import { VIBRATION_PATTERNS } from '@/services/feedback/types';
import { usePreferences } from '@/services/preferences/PreferencesProvider';
import {
  ANNOUNCEMENT_SENT,
  CANNOT_SPEAK_NOTE,
  CANNOT_VIBRATE_NOTE,
  FEEDBACK_LEDE,
  HAPTIC_CLASSES,
  HAPTIC_NOT_BUILT,
  HEAR_ANNOUNCEMENT_LABEL,
  SAMPLE_ANNOUNCEMENT,
  TRY_VIBRATION_LABEL,
  VIBRATION_REFUSED,
  VIBRATION_REQUESTED,
  VIBRATION_SWITCHED_OFF,
} from '../onboardingCopy';
import { StepLede, StepSection } from './StepSection';

export function FeedbackStep() {
  const { preferences } = usePreferences();
  const { announce, vibrate, canVibrate, canSpeak } = useFeedback();
  const [vibrationResult, setVibrationResult] = useState<string | null>(null);
  const [announcementResult, setAnnouncementResult] = useState<string | null>(null);

  const tryVibration = () => {
    const vibrated = vibrate(VIBRATION_PATTERNS.confirm);
    const message = vibrated ? VIBRATION_REQUESTED : preferences.hapticFeedback ? VIBRATION_REFUSED : VIBRATION_SWITCHED_OFF;
    setVibrationResult(message);
    announce(message);
  };

  const hearAnnouncement = () => {
    announce(SAMPLE_ANNOUNCEMENT, { forceSpeech: true });
    setAnnouncementResult(ANNOUNCEMENT_SENT);
  };

  return (
    <>
      <StepLede>{FEEDBACK_LEDE}</StepLede>

      <StepSection title="The four vibration patterns" aside={<EvidenceLabel kind="design_intent" />} card>
        <dl className="grid gap-3">
          {HAPTIC_CLASSES.map((haptic) => (
            <div key={haptic.id} className="grid gap-0.5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
              <dt className="font-semibold">{haptic.name}</dt>
              <dd>{haptic.description}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-muted-foreground">{HAPTIC_NOT_BUILT}</p>
      </StepSection>

      <StepSection title="Try it on this device">
        <div className="grid gap-2">
          {canVibrate ? (
            <>
              <div>
                <Button variant="secondary" leadingIcon={<Vibrate className="h-4 w-4" />} onClick={tryVibration}>
                  {TRY_VIBRATION_LABEL}
                </Button>
              </div>
              {vibrationResult && <p>{vibrationResult}</p>}
            </>
          ) : (
            <p className="text-muted-foreground">{CANNOT_VIBRATE_NOTE}</p>
          )}
        </div>
        <div className="grid gap-2">
          <div>
            <Button variant="secondary" leadingIcon={<Volume2 className="h-4 w-4" />} onClick={hearAnnouncement}>
              {HEAR_ANNOUNCEMENT_LABEL}
            </Button>
          </div>
          {announcementResult && <p>{announcementResult}</p>}
          {!canSpeak && <p className="text-sm text-muted-foreground">{CANNOT_SPEAK_NOTE}</p>}
        </div>
      </StepSection>
    </>
  );
}
