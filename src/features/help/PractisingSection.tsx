import { Link } from 'react-router';
import { ROUTES } from '@/app/routes';
import { DataTable, EvidenceLabel, type DataTableColumn } from '@/components';
import { EMERGENCY_SIMULATION_NOTICE } from '@/domain/evidence';
import { EMERGENCY_ARMING_CUE_MS, formatMs } from '@/domain/timing';
import { EMERGENCY_HOLD_TEXT, SOURCE_GLOSSARY, TAP_MAX_TEXT, WINDOW_TEXT, timingRows, type TimingRow } from './helpContent';
import { HelpSection, HelpSubsection } from './HelpSection';
import { InPageLink } from './InPageLink';
import { INLINE_LINK, STANDALONE_LINK } from './helpStyles';

const TIMING_COLUMNS: readonly DataTableColumn<TimingRow>[] = [
  { key: 'label', header: 'Timing', rowHeader: true, cell: (row) => row.label },
  { key: 'value', header: 'Value', cell: (row) => <span className="whitespace-nowrap">{row.value}</span> },
  { key: 'status', header: 'Status', cell: (row) => row.status },
  { key: 'source', header: 'Source', cell: (row) => row.source },
];

const TIMING_ROWS = timingRows();

export function PractisingSection() {
  return (
    <HelpSection
      id="practising"
      lede="How the command window works, how taps differ from the emergency hold, and the tools for practising with a keyboard or screen reader."
    >
      <HelpSubsection title="The command window">
        <div className="grid max-w-prose gap-2">
          <p>
            A squeeze opens the command window. A tap only counts while the window is open; once it closes, squeeze again.
            The bench firmware keeps the window open for {WINDOW_TEXT.normal}.
          </p>
          <p>
            In Demo Mode, switch on{' '}
            <Link to={ROUTES.settings} className={INLINE_LINK}>
              Longer interaction time in Settings
            </Link>{' '}
            to get {WINDOW_TEXT.longer} instead. A bench ring keeps its own {WINDOW_TEXT.normal} window, so the setting only
            changes practice with the simulated ring.
          </p>
        </div>
        <div className="grid gap-2">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <EvidenceLabel kind="design_intent" />
            <span className="text-sm text-muted-foreground">None of these values has been measured on a wearable ring.</span>
          </p>
          <DataTable
            caption="Timing values and where they come from"
            columns={TIMING_COLUMNS}
            rows={TIMING_ROWS}
            rowKey={(row) => row.id}
            emptyMessage="No timing values."
            dense
          />
          <p className="max-w-prose text-sm text-muted-foreground">{SOURCE_GLOSSARY}</p>
        </div>
      </HelpSubsection>

      <HelpSubsection title="Taps and holds">
        <div className="grid max-w-prose gap-2">
          <p>
            Every command except Emergency is a brief tap of up to {TAP_MAX_TEXT}. Emergency is the only hold: keep your thumb
            on the pinky fingertip for {EMERGENCY_HOLD_TEXT}. In the design, the ring would pulse once at{' '}
            {formatMs(EMERGENCY_ARMING_CUE_MS)} so you know the hold is being counted, then give a long alert when it
            completes. Letting go early cancels it.
          </p>
          <p>A press longer than a tap but shorter than the emergency hold is dropped, never guessed.</p>
        </div>
      </HelpSubsection>

      <HelpSubsection title="What “Not recognised” means">
        <div className="grid max-w-prose gap-2">
          <p>
            Not recognised means the press did not count, so nothing happened on the phone. Tactiq drops a press rather
            than guess what you meant. The message says why:
          </p>
          <ul className="grid list-disc gap-1 pl-6 marker:text-muted-foreground">
            <li>
              <span className="font-semibold">Press too long:</span> it lasted longer than a tap but less than the emergency
              hold.
            </li>
            <li>
              <span className="font-semibold">Ring asleep:</span> the tap came before a squeeze.
            </li>
            <li>
              <span className="font-semibold">Window closed:</span> the command window timed out before the tap.
            </li>
          </ul>
          <p>
            Squeeze, then tap briefly. If it keeps happening, read{' '}
            <InPageLink targetId="commands-not-recognised" className={INLINE_LINK}>
              Commands are not recognised
            </InPageLink>
            .
          </p>
        </div>
      </HelpSubsection>

      <HelpSubsection title="Hand view and list view">
        <p className="max-w-prose">
          Practice screens can show the eight contact points two ways. Hand view draws a hand with each point where it sits
          on your fingers. List view shows the same points as a list of buttons, which is often quicker with a screen reader,
          a keyboard or a switch. Both work the same way; choose one under “Show the contact points as”.
        </p>
      </HelpSubsection>

      <HelpSubsection title="The emergency hold button">
        <div className="grid max-w-prose gap-2">
          <p>
            Keeping a key or finger down for five seconds is not practical with every screen reader or switch. After you
            squeeze, the Start five-second hold on pinky fingertip button starts the hold for you. Press it again, or press
            Escape, to let go; letting go before five seconds cancels the hold.
          </p>
          <p>
            When a hold completes, the app shows and announces: <q className="font-semibold">{EMERGENCY_SIMULATION_NOTICE}</q>
          </p>
        </div>
      </HelpSubsection>

      <ul role="list" className="flex flex-wrap gap-x-6">
        <li>
          <Link to={ROUTES.simulator} className={STANDALONE_LINK}>
            Practise in the Simulator
          </Link>
        </li>
        <li>
          <Link to={ROUTES.train} className={STANDALONE_LINK}>
            Take the lessons in Train
          </Link>
        </li>
      </ul>
    </HelpSection>
  );
}
