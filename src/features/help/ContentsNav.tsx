import { HELP_SECTIONS } from './helpSections';
import { InPageLink } from './InPageLink';

/** The in-page contents list at the top of Help. */
export function ContentsNav() {
  return (
    <nav aria-label="On this page" className="rounded-lg border border-border bg-card px-4 py-3 shadow-card sm:px-5">
      <p aria-hidden="true" className="font-mono-label text-muted-foreground">
        On this page
      </p>
      <ul className="-mx-2 mt-1 flex flex-wrap gap-x-1">
        {HELP_SECTIONS.map((section) => (
          <li key={section.id}>
            <InPageLink
              targetId={section.id}
              className="target-44 inline-flex items-center rounded-sm px-2 font-medium text-primary-strong underline"
            >
              {section.title}
            </InPageLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
