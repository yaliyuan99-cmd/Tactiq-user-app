import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { settingsHeadingId, settingsSectionTitle, type SettingsSectionId } from './settingsSections';

export interface SettingsSectionProps {
  readonly id: SettingsSectionId;
  /** One or two plain sentences under the heading. */
  readonly intro?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}

/**
 * One settings region: a card surface named by its h2. The heading can take
 * focus (tabIndex -1) so the contents list can move keyboard and screen
 * reader users straight to it.
 */
export function SettingsSection({ id, intro, children, className }: SettingsSectionProps) {
  const headingId = settingsHeadingId(id);
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn(
        // min-w-0: as a grid item the section would otherwise be at least as wide
        // as its widest content, pushing the whole page sideways at 320 px.
        'min-w-0 rounded-lg border-[1.5px] border-foreground bg-card p-5 text-card-foreground shadow-card sm:p-6',
        className,
      )}
    >
      <h2 id={headingId} tabIndex={-1}>
        {settingsSectionTitle(id)}
      </h2>
      {intro && <p className="mt-2 max-w-prose text-muted-foreground">{intro}</p>}
      <div className="mt-5 grid min-w-0 gap-6">{children}</div>
    </section>
  );
}

/**
 * Class for a SwitchField row inside a section. The label takes a 10rem flex
 * basis and the row is allowed to wrap, so at 320 px with Larger text the
 * switch drops under its label instead of pushing the page sideways
 * (WCAG 1.4.10 Reflow). At ordinary widths the row still reads as one line.
 */
export const WRAPPING_SWITCH_ROW = 'flex-wrap [&>div:first-child]:flex-1 [&>div:first-child]:basis-40';

/** A thin rule between groups of controls inside a section. */
export function SettingsDivider() {
  return <hr className="border-0 border-t border-border" />;
}
