import { ArrowRight, ChevronDown } from 'lucide-react';
import { Link } from 'react-router';
import { BrowserCheck } from './BrowserCheck';
import { HelpSection } from './HelpSection';
import { STANDALONE_LINK } from './helpStyles';
import { TROUBLESHOOTING_ENTRIES, type TroubleshootingEntry } from './troubleshooting';

const STEP_LIST = 'grid gap-1.5 pl-6 marker:text-muted-foreground';

function TroubleshootingItem({ entry }: { readonly entry: TroubleshootingEntry }) {
  const List = entry.ordered ? 'ol' : 'ul';
  return (
    <details id={entry.id} className="group">
      <summary className="target-44 flex cursor-pointer list-none items-center justify-between gap-4 rounded-md px-4 py-3 font-semibold hover:bg-secondary [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">{entry.question}</span>
        <ChevronDown
          className="h-5 w-5 shrink-0 text-muted-foreground group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="grid max-w-prose gap-3 px-4 pb-5 pt-1">
        <p>{entry.intro}</p>
        <List className={`${STEP_LIST} ${entry.ordered ? 'list-decimal' : 'list-disc'}`}>
          {entry.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </List>
        {entry.note && <p className="font-medium">{entry.note}</p>}
        {entry.check && <BrowserCheck topic={entry.check} />}
        {entry.links.length > 0 && (
          <ul role="list" className="flex flex-wrap gap-x-6">
            {entry.links.map((link) => (
              <li key={link.label}>
                <Link to={link.to} className={STANDALONE_LINK}>
                  {link.label}
                  <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}

export function TroubleshootingSection() {
  return (
    <HelpSection
      id="troubleshooting"
      lede="Choose a problem to show what to try. The most likely fix comes first."
    >
      <div className="max-w-3xl divide-y divide-border rounded-lg border border-border bg-card">
        {TROUBLESHOOTING_ENTRIES.map((entry) => (
          <TroubleshootingItem key={entry.id} entry={entry} />
        ))}
      </div>
    </HelpSection>
  );
}
