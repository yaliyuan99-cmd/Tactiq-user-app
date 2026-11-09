import { type MouseEvent } from 'react';
import { useNavigate } from 'react-router';
import { usePreferences } from '@/services/preferences/PreferencesProvider';
import { SETTINGS_SECTIONS, focusSettingsHeading, type SettingsSectionId } from './settingsSections';

const LABEL_ID = 'settings-contents-label';

function isPlainClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

/**
 * A short in-page contents list. Each link is a real fragment link (it works
 * without script and in a new tab). A plain click updates the address,
 * scrolls to the section and moves focus to its heading, so keyboard and
 * screen reader users continue from there; browsers otherwise drop focus on
 * an in-page jump.
 */
export function SettingsContents() {
  const navigate = useNavigate();
  const { prefersReducedMotion } = usePreferences();

  const jump = (event: MouseEvent<HTMLAnchorElement>, id: SettingsSectionId) => {
    if (event.defaultPrevented || !isPlainClick(event)) return;
    event.preventDefault();
    navigate({ hash: `#${id}` });
    const section = document.getElementById(id);
    if (section && typeof section.scrollIntoView === 'function') {
      section.scrollIntoView({ block: 'start', behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }
    focusSettingsHeading(id);
  };

  return (
    <nav aria-labelledby={LABEL_ID} className="mb-6 rounded-lg border-[1.5px] border-foreground bg-card px-4 py-3 shadow-card sm:px-5">
      <p id={LABEL_ID} className="font-mono-label text-muted-foreground">
        On this page
      </p>
      <ul className="-mx-2 mt-1 flex flex-wrap gap-x-1">
        {SETTINGS_SECTIONS.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              onClick={(event) => jump(event, section.id)}
              className="target-44 inline-flex items-center rounded-sm px-2 font-medium text-primary-strong underline"
            >
              {section.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
