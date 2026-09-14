import { MonitorSmartphone } from 'lucide-react';
import { useDevice } from '@/services/device/DeviceProvider';
import { useFeedback } from '@/services/feedback/FeedbackProvider';
import { bluetoothCheckText, speechCheckText, vibrationCheckText } from './browserChecks';

export type BrowserCheckTopic = 'bluetooth' | 'speech' | 'vibration';

function BrowserCheckLine({ text }: { readonly text: string }) {
  return (
    <p className="flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-sm">
      <MonitorSmartphone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span>
        <span className="font-semibold">In this browser: </span>
        {text}
      </span>
    </p>
  );
}

function BluetoothCheck() {
  const { capabilities } = useDevice();
  return <BrowserCheckLine text={bluetoothCheckText(capabilities)} />;
}

function SpeechCheck() {
  const { canSpeak } = useFeedback();
  return <BrowserCheckLine text={speechCheckText(canSpeak)} />;
}

function VibrationCheck() {
  const { canVibrate } = useFeedback();
  return <BrowserCheckLine text={vibrationCheckText(canVibrate)} />;
}

/** One line stating what this browser actually offers for a topic. Static text, not a live region. */
export function BrowserCheck({ topic }: { readonly topic: BrowserCheckTopic }) {
  switch (topic) {
    case 'bluetooth':
      return <BluetoothCheck />;
    case 'speech':
      return <SpeechCheck />;
    case 'vibration':
      return <VibrationCheck />;
  }
}
