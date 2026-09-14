/**
 * /dashboard — the overview. At a glance: what to do next, whether the ring
 * is reachable, training and calibration progress, the command map and the
 * latest activity. Mobile: one column in that order. lg: the next step and
 * the ring status span the top, then a two-column row (training, calibration),
 * then the command map and activity at full width.
 */
import { PageHeader } from '@/components';
import { usePageTitle } from '@/lib/usePageTitle';
import { useAuth } from '@/services/auth/AuthProvider';
import { useDevice } from '@/services/device/DeviceProvider';
import { usePreferences } from '@/services/preferences/PreferencesProvider';
import { useCalibration, useTraining } from '@/services/ServicesProvider';
import { CalibrationSection } from './CalibrationSection';
import { CommandsSection } from './CommandsSection';
import { DeviceStatusSection } from './DeviceStatusSection';
import { DASHBOARD_EYEBROW, DASHBOARD_TITLE, dashboardTitle } from './greeting';
import { nextAction } from './nextAction';
import { NextStepPanel } from './NextStepPanel';
import { RecentActivitySection } from './RecentActivitySection';
import { TrainingSection } from './TrainingSection';

export default function DashboardPage() {
  usePageTitle(DASHBOARD_TITLE);
  const now = new Date();
  const { user } = useAuth();
  const { preferences } = usePreferences();
  const { state } = useDevice();
  const calibration = useCalibration().summary();
  const training = useTraining().summary();

  const action = nextAction({
    onboardingCompleted: preferences.onboardingCompleted,
    onboardingStep: preferences.onboardingStep,
    deviceMode: state.mode,
    deviceStatus: state.status,
    calibrationStatus: calibration.status,
    nextLesson: training.nextLesson,
  });

  return (
    <>
      <PageHeader eyebrow={DASHBOARD_EYEBROW} title={dashboardTitle(user?.displayName, now)} />
      <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-5">
        <NextStepPanel action={action} className="lg:col-span-5" />
        <DeviceStatusSection now={now} className="lg:col-span-5" />
        <TrainingSection summary={training} className="lg:col-span-3" />
        <CalibrationSection summary={calibration} now={now} className="lg:col-span-2" />
        <CommandsSection className="lg:col-span-5" />
        <RecentActivitySection now={now} className="lg:col-span-5 lg:mt-2" />
      </div>
    </>
  );
}
