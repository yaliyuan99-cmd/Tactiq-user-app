import { Link } from 'react-router';
import { helpRoute } from '@/app/routes';
import { DEVICE_NAME } from '@/domain/protocol';

const TIPS: readonly { readonly problem: string; readonly fix: string }[] = [
  {
    problem: 'The Bluetooth window does not list the ring.',
    fix: `Check the ring is switched on, close to this device and running the Tactiq bench firmware. It advertises as “${DEVICE_NAME}”.`,
  },
  {
    problem: 'Choosing Connect a ring does nothing.',
    fix: 'Use Chrome or Edge on a computer or Android phone, and open Tactiq from its https address.',
  },
  {
    problem: 'The browser blocked Bluetooth.',
    fix: 'Allow Bluetooth for this site in your browser’s site settings, then try again.',
  },
  {
    problem: 'The ring keeps disconnecting.',
    fix: 'Move it closer and check it is powered. Tactiq tries to reconnect once after a dropped link.',
  },
  {
    problem: 'A test ping gets no reply.',
    fix: 'Disconnect, switch the ring off and on, then connect again.',
  },
];

export function Troubleshooting() {
  return (
    <section aria-labelledby="connect-troubleshooting-heading" className="grid gap-4">
      <h2 id="connect-troubleshooting-heading">Troubleshooting</h2>
      <ul className="grid gap-3">
        {TIPS.map((tip) => (
          <li key={tip.problem} className="border-l-2 border-border-strong pl-4">
            <span className="block font-medium">{tip.problem}</span>
            <span className="block text-muted-foreground">{tip.fix}</span>
          </li>
        ))}
      </ul>
      <p>
        <Link
          to={helpRoute('troubleshooting')}
          className="target-44 inline-flex items-center font-medium text-primary-strong underline"
        >
          Read the full troubleshooting guide
        </Link>
      </p>
    </section>
  );
}
