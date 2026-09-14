import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { ROUTES } from '@/app/routes';
import { COMMAND_SUMMARY_ROWS, EMERGENCY_HOLD_TEXT } from './helpContent';
import { HelpSection } from './HelpSection';
import { STANDALONE_LINK } from './helpStyles';

export function CommandsSection() {
  return (
    <HelpSection
      id="commands"
      lede="Eight contact points carry nine commands. Seven are fixed; you can customise Shortcut 1 and Shortcut 2."
    >
      <ul role="list" aria-label="Contact points and their commands" className="max-w-3xl divide-y divide-border rounded-lg border border-border bg-card">
        {COMMAND_SUMMARY_ROWS.map((row) => (
          <li key={row.token} className="grid gap-x-6 gap-y-0.5 px-4 py-3 sm:grid-cols-2 sm:items-baseline">
            <p className="min-w-0">
              <span className="font-medium">{row.contact}</span>
              <span className="sr-only">, </span>
              <span aria-hidden="true" className="text-muted-foreground">
                {' · '}
              </span>
              <span className="text-muted-foreground">{row.touch}</span>
            </p>
            <p className="flex min-w-0 flex-wrap items-baseline gap-x-2">
              <span className="sr-only">: </span>
              <ArrowRight className="h-4 w-4 shrink-0 self-center text-muted-foreground" aria-hidden="true" />
              <span className="font-semibold">{row.command}</span>
              <span className="sr-only">, </span>
              <span className="font-mono-label text-muted-foreground">{row.kind}</span>
            </p>
          </li>
        ))}
      </ul>

      <div className="grid max-w-prose gap-2">
        <p>
          Emergency is not a tap. It is a hold of {EMERGENCY_HOLD_TEXT} on the pinky fingertip, the same point as Shortcut
          1, and it is fixed: it can never be changed or remapped.
        </p>
        <p>
          <Link to={ROUTES.commands} className={STANDALONE_LINK}>
            See the full command map and customise your shortcuts
          </Link>
        </p>
      </div>
    </HelpSection>
  );
}
