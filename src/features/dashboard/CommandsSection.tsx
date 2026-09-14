import { ROUTES } from '@/app/routes';
import { Card, HandMap } from '@/components';
import { cn } from '@/lib/cn';
import { useCommandMapping } from '@/services/ServicesProvider';
import { usePreferences } from '@/services/preferences/PreferencesProvider';
import { commandRows, type CommandRow } from './commandRows';
import { DashboardLink } from './DashboardLink';

export interface CommandsSectionProps {
  readonly className?: string;
}

/** The two-letter badge from the hand map: dark for fixed commands, accent for shortcuts and Emergency. */
function PointBadge({ row }: { row: CommandRow }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'font-mono-label relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-medium leading-none',
        row.kind === 'fixed' ? 'bg-foreground text-background' : 'bg-primary text-primary-foreground',
      )}
    >
      {row.abbreviation}
      {row.kind === 'emergency' && (
        <span className="pointer-events-none absolute -inset-[4px] rounded-full border-2 border-dashed border-primary" />
      )}
    </span>
  );
}

/** "Commands": a small hand drawing beside a compact list of the nine interactions. */
export function CommandsSection({ className }: CommandsSectionProps) {
  const mapping = useCommandMapping().get();
  const { preferences } = usePreferences();
  const rows = commandRows(mapping.shortcuts);

  return (
    <Card
      heading="Commands"
      className={className}
      actions={<DashboardLink to={ROUTES.commands}>Change shortcuts</DashboardLink>}
    >
      <p className="max-w-prose text-muted-foreground">
        The ring is designed so that, after a squeeze, your thumb touches one of these points. Seven commands are fixed; you choose what the two shortcuts do.
      </p>
      <div className="mt-5 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        {/* The drawing repeats the list beside it, so it is hidden from assistive technology. */}
        <div aria-hidden="true" className="w-full">
          <HandMap hand={preferences.hand} interactive={false} size="sm" />
        </div>
        <ul aria-label="Contact points and their commands" className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
          {rows.map((row) => (
            <li key={row.token} className="flex min-w-0 items-center gap-3 border-b border-border py-2.5" data-command={row.token}>
              <PointBadge row={row} />
              <span className="flex min-w-0 flex-col">
                <span className="text-sm text-muted-foreground">
                  {row.point}
                  <span className="sr-only">:</span>
                </span>
                <span className="font-medium">{row.command}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
