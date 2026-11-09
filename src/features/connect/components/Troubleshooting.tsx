import { Link } from 'react-router';
import { ChevronDown } from 'lucide-react';
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
      <ul role="list" className="divide-y divide-border rounded-lg border-[1.5px] border-foreground bg-card shadow-card">
        {TIPS.map((tip) => (
          <li key={tip.problem}>
            <details className="group">
              <summary className="target-44 flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-medium transition-colors duration-[var(--dur-tap)] hover:bg-muted [&::-webkit-details-marker]:hidden">
                {tip.problem}
                <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="px-4 pb-4 text-muted-foreground text-pretty">{tip.fix}</p>
            </details>
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
