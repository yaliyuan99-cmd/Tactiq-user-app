import { ButtonLink, EvidenceLabel } from '@/components';
import { ROUTES } from '@/app/routes';
import { useDevice } from '@/services/device/DeviceProvider';
import {
  CALIBRATION_DEMO,
  CALIBRATION_HOW,
  CALIBRATION_LATER,
  CALIBRATION_WHAT,
  OPEN_CALIBRATION_LABEL,
  OPEN_CALIBRATION_NOTE,
} from '../onboardingCopy';
import { StepLede, StepSection } from './StepSection';

export interface CalibrationStepProps {
  /** Saves setup progress; runs before the link navigates. */
  readonly onOpenCalibration: () => void;
}

export function CalibrationStep({ onOpenCalibration }: CalibrationStepProps) {
  const { state } = useDevice();
  const isDemo = state.mode === 'demo';

  return (
    <>
      <StepLede>{CALIBRATION_WHAT}</StepLede>
      <StepSection title="What it involves" card>
        <p>{CALIBRATION_HOW}</p>
        {isDemo ? (
          <div className="grid gap-1.5">
            <EvidenceLabel kind="simulated" />
            <p>{CALIBRATION_DEMO}</p>
          </div>
        ) : (
          <p>With a Bluetooth bench ring, the app would record the points the ring reports for each tap.</p>
        )}
      </StepSection>
      <StepSection title="Now or later" intro={CALIBRATION_LATER}>
        <div className="grid gap-2">
          <div>
            <ButtonLink to={ROUTES.calibrate} variant="secondary" onClick={onOpenCalibration}>
              {OPEN_CALIBRATION_LABEL}
            </ButtonLink>
          </div>
          <p className="text-sm text-muted-foreground">{OPEN_CALIBRATION_NOTE}</p>
        </div>
      </StepSection>
    </>
  );
}
