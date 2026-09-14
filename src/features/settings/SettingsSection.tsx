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
      className={cn('rounded-lg border border-border bg-card p-5 text-card-foreground shadow-card sm:p-6', className)}
    >
      <h2 id={headingId} tabIndex={-1}>
        {settingsSectionTitle(id)}
      </h2>
      {intro && <p className="mt-2 max-w-prose text-muted-foreground">{intro}</p>}
      <div className="mt-5 grid min-w-0 gap-6">{children}</div>
    </section>
  );
}

/** A thin rule between groups of controls inside a section. */
export function SettingsDivider() {
  return <hr className="border-0 border-t border-border" />;
}
