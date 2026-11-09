import { type ReactNode } from 'react';
import { Link } from 'react-router';
import { EvidenceLabel } from '@/components';
import { MockPhone } from '@/components/product/MockPhone';
import type { PhoneState } from '@/components/product/tryItModel';
import { ROUTES } from '@/app/routes';
import type { CommandToken, ShortcutMapping } from '@/domain/commands';
import { EMERGENCY_SIMULATION_NOTICE } from '@/domain/evidence';
import { cn } from '@/lib/cn';
import { CARD_CLASSES, LINK_CLASSES, SIMULATOR_HEADING_IDS } from './simulatorIds';
import { whatWouldHappen } from './whatWouldHappen';

export interface WhatWouldHappenPanelProps {
  /** The last command recognised in free practice, or null before the first. */
  readonly token: CommandToken | null;
  readonly mapping: ShortcutMapping;
  /** The pretend phone, following each command tapped in free practice. */
  readonly phone: PhoneState;
  /** What that phone would say after the last command, or null before the first. */
  readonly spoken: string | null;
  readonly className?: string;
}

function Row({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div>
      <dt className="font-mono-label text-muted-foreground">{term}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

/**
 * Free practice: what the last command is designed to do on a phone. Not a
 * live region; the ring's announcement already said what was recognised.
 */
export function WhatWouldHappenPanel({ token, mapping, phone, spoken, className }: WhatWouldHappenPanelProps) {
  const view = token ? whatWouldHappen(token, mapping) : null;

  return (
    <section aria-labelledby={SIMULATOR_HEADING_IDS.whatWouldHappen} className={cn(CARD_CLASSES, className)}>
      <h2 id={SIMULATOR_HEADING_IDS.whatWouldHappen}>What would happen</h2>
      <MockPhone phone={phone} className="mt-4" />
      {spoken && (
        <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm">
          <span className="text-muted-foreground">The example phone would say: </span>
          {spoken}
        </p>
      )}
      {view === null ? (
        <p className="mt-3 text-muted-foreground">
          Squeeze, then tap any point. What its command is designed to do on a phone appears here.
        </p>
      ) : (
        <>
          <h3 className="mt-3">{view.title}</h3>
          <dl className="mt-3 grid gap-3">
            <Row term="What it is for">{view.description}</Row>
            <Row term="How the phone would carry it out">{view.platformRoute}</Row>
            {view.shortcut && (
              <Row term="Your shortcut">
                {view.shortcut.actionLabel}. {view.shortcut.actionDescription}
              </Row>
            )}
            {view.shortcut && (
              <Row term="Outcome in the simulator">
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>{view.shortcut.simulatedOutcome}</span>
                  <EvidenceLabel kind="simulated" />
                </span>
              </Row>
            )}
          </dl>
          {view.isEmergency && <p className="mt-4 font-medium">{EMERGENCY_SIMULATION_NOTICE}</p>}
          {view.shortcut && (
            <p className="mt-4 text-sm">
              <Link to={ROUTES.commands} className={LINK_CLASSES}>
                Customise your shortcuts
              </Link>
            </p>
          )}
        </>
      )}
    </section>
  );
}
