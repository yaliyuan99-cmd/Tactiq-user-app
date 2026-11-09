import { type ReactNode } from 'react';
import { ChevronRight, TriangleAlert } from 'lucide-react';
import { EvidenceLabel } from '@/components';
import { COMMANDS, type CommandDefinition } from '@/domain/commands';
import { cn } from '@/lib/cn';
import { usePreferences } from '@/services/preferences/PreferencesProvider';
import { NOT_GUARANTEED_TEXT, commandWhereAndHow } from './commandPresentation';

function Row({ term, children }: { term: ReactNode; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
      <dt className="font-medium">{term}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function FeedbackDetails({ command }: { command: CommandDefinition }) {
  return (
    <dl className="grid gap-3">
      <Row
        term={
          <span className="flex flex-wrap items-center gap-x-2">
            Haptic <EvidenceLabel kind="design_intent" />
          </span>
        }
      >
        {command.feedback.haptic}
      </Row>
      <Row term="Visual">
        {command.feedback.visual}
        <span className="mt-0.5 block text-sm text-muted-foreground">Shown in this app when Visual confirmation is on.</span>
      </Row>
      <Row term="Text">{command.feedback.text}</Row>
      <Row term="Platform route">
        {command.platformRoute}
        {!command.guaranteed && (
          <span className="mt-1 flex items-start gap-1.5 font-medium">
            <TriangleAlert className="mt-1 h-4 w-4 shrink-0 text-status-target" aria-hidden="true" />
            {NOT_GUARANTEED_TEXT}
          </span>
        )}
      </Row>
      {command.kind === 'emergency' && (
        <Row term="In this app">
          The hold is practised in the simulator only. It never contacts emergency services or anyone else.
        </Row>
      )}
    </dl>
  );
}

/** One expandable entry per command: the feedback it is designed to give and how the phone would carry it out. */
export function CommandFeedbackList() {
  const { prefersReducedMotion } = usePreferences();
  return (
    <ul className="divide-y divide-border rounded-lg border-[1.5px] border-foreground bg-card">
      {COMMANDS.map((command) => (
        <li key={command.token}>
          <details className="group" data-command={command.token}>
            <summary className="target-44 flex cursor-pointer list-none items-center gap-3 rounded-lg px-4 py-3 hover:bg-secondary [&::-webkit-details-marker]:hidden">
              <ChevronRight
                className={cn(
                  'h-5 w-5 shrink-0 text-muted-foreground group-open:rotate-90',
                  !prefersReducedMotion && 'transition-transform duration-[var(--dur-move)]',
                )}
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="block font-medium">{command.label}</span>
                <span className="block text-sm text-muted-foreground">{commandWhereAndHow(command)}</span>
              </span>
            </summary>
            <div className="px-4 pb-5 pt-1 sm:pl-12">
              <FeedbackDetails command={command} />
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
