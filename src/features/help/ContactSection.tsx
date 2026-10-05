import { ExternalLink } from 'lucide-react';
import { Callout } from '@/components';
import { HelpSection } from './HelpSection';
import { STANDALONE_LINK } from './helpStyles';

export const PROJECT_WEBSITE_URL = 'https://tactiq0.netlify.app/';

/**
 * No email address is listed. The project has no mailbox of its own yet, and an
 * address that cannot receive mail would silently lose the accessibility reports
 * this section asks for. The project website is the only published route to the
 * team, so that is what the page offers.
 */
export const NO_EMAIL_NOTE =
  'This student project has no mailbox of its own yet, so there is no address to write to. The project website below is the only published way to reach the team.';

export function ContactSection() {
  return (
    <HelpSection id="contact" lede="Questions, feedback, or an accessibility problem with the app? We would like to hear from you.">
      <p className="max-w-prose">{NO_EMAIL_NOTE}</p>
      <ul role="list" className="grid gap-1">
        <li>
          <a href={PROJECT_WEBSITE_URL} className={STANDALONE_LINK}>
            <ExternalLink className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>
              Tactiq project website <span className="font-normal">(tactiq0.netlify.app — opens in this tab and leaves the app)</span>
            </span>
          </a>
        </li>
      </ul>
      <p className="max-w-prose text-muted-foreground">
        If you are reporting a problem, it helps to say which screen you were on, what you expected and what happened,
        and which browser and screen reader you were using.
      </p>
      <Callout kind="warning" className="max-w-prose">
        <p>
          Do not rely on the project website in an emergency. Tactiq cannot contact emergency services; call your local
          emergency number.
        </p>
      </Callout>
    </HelpSection>
  );
}
