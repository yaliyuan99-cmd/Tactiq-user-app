import { ExternalLink, Mail } from 'lucide-react';
import { Callout } from '@/components';
import { HelpSection } from './HelpSection';
import { STANDALONE_LINK } from './helpStyles';

export const CONTACT_EMAIL = 'hello@tactiq.app';
export const PROJECT_WEBSITE_URL = 'https://tactiq0.netlify.app/';

export function ContactSection() {
  return (
    <HelpSection id="contact" lede="Questions, feedback, or an accessibility problem with the app? We would like to hear from you.">
      <ul role="list" className="grid gap-1">
        <li>
          <a href={`mailto:${CONTACT_EMAIL}`} className={STANDALONE_LINK}>
            <Mail className="h-5 w-5 shrink-0" aria-hidden="true" />
            Email {CONTACT_EMAIL}
          </a>
        </li>
        <li>
          <a href={PROJECT_WEBSITE_URL} className={STANDALONE_LINK}>
            <ExternalLink className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>
              Tactiq project website <span className="font-normal">(tactiq0.netlify.app — opens in this tab and leaves the app)</span>
            </span>
          </a>
        </li>
      </ul>
      <Callout kind="warning" className="max-w-prose">
        <p>Do not use this email in an emergency. Tactiq cannot contact emergency services; call your local emergency number.</p>
      </Callout>
    </HelpSection>
  );
}
