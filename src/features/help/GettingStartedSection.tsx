import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { GETTING_STARTED_STEPS, NEXT_STEP_LINKS } from './helpContent';
import { HelpSection, HelpSubsection } from './HelpSection';

export function GettingStartedSection() {
  return (
    <HelpSection
      id="getting-started"
      divider={false}
      lede="Every command is designed to follow the same five steps. Until a ring exists, you can practise them with the simulated ring in Demo Mode."
    >
      <ol role="list" className="grid max-w-prose gap-4">
        {GETTING_STARTED_STEPS.map((step, index) => (
          <li key={step.id} className="grid grid-cols-[2.25rem_minmax(0,1fr)] items-start gap-3">
            <span className="font-mono-label flex h-9 w-9 items-center justify-center rounded-full border border-border-strong bg-card text-foreground">
              <span className="sr-only">Step </span>
              {index + 1}
            </span>
            <p className="pt-1">
              <span className="block font-semibold">{step.title}</span>
              <span className="block">{step.text}</span>
            </p>
          </li>
        ))}
      </ol>

      <HelpSubsection title="Set up and practise">
        <ul role="list" className="max-w-2xl divide-y divide-border rounded-lg border border-border bg-card">
          {NEXT_STEP_LINKS.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                className="target-44 flex items-center justify-between gap-4 px-4 py-3 no-underline hover:bg-secondary"
              >
                <span className="min-w-0">
                  <span className="block font-semibold text-primary-strong underline">{link.label}</span>
                  <span className="sr-only">: </span>
                  <span className="block text-muted-foreground">{link.description}</span>
                </span>
                <ArrowRight className="h-5 w-5 shrink-0 text-primary-strong" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </HelpSubsection>
    </HelpSection>
  );
}
