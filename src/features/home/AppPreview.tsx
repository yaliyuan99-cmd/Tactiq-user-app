import { ArrowRight } from 'lucide-react';
import { HOME_SECTIONS } from '@/app/publicRoutes';
import { ROUTES } from '@/app/routes';
import { ButtonLink, EvidenceLabel, StatusPill } from '@/components';
import { HomeSection } from './HomeSection';
import { APP_CAPABILITIES } from './homeContent';
import { EYEBROW } from './homeStyles';

/**
 * What exists today. The panel is a static composition of the app's own
 * components filled with example content, labelled as an example: it is not a
 * screenshot, not a recording and carries no figure that could be read as a
 * result.
 */
export function AppPreview() {
  return (
    <HomeSection
      id={HOME_SECTIONS.app}
      layout="split"
      eyebrow="The app"
      heading="The part you can use today"
      lede="Open it in a browser and the ring is simulated: you squeeze and tap on screen, or with a keyboard, and the app answers exactly as the design says a ring would."
    >
      <div className="rounded-lg border border-border bg-card p-5 text-card-foreground shadow-card sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border pb-3">
          <p className={EYEBROW}>Practice · simulated ring</p>
          <StatusPill status="demo" />
        </div>

        <p className={`${EYEBROW} mt-5`}>What the app asked for</p>
        <p className="mt-1 text-lg">Squeeze, then tap the index fingertip for Confirm.</p>

        <div className="mt-5 rounded-md border border-border bg-background p-4">
          <p className={EYEBROW}>What came back</p>
          <p className="mt-1 text-lg font-semibold">Recognised — Confirm</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Index fingertip, inside the command window. Read aloud, shown on screen, and recorded in your activity.
          </p>
          <p className="mt-3">
            <EvidenceLabel kind="simulated" detail="example content, not a recording" />
          </p>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          An example of the practice screen, drawn with the app’s own components. No accuracy, score or device figure is
          shown here, because none would mean anything yet.
        </p>
      </div>

      <dl className="mt-10 divide-y divide-border border-y border-border">
        {APP_CAPABILITIES.map((capability) => (
          <div key={capability.id} className="grid gap-1 py-4 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)] sm:gap-6">
            <dt className="font-medium">{capability.title}</dt>
            <dd className="text-muted-foreground">{capability.text}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <ButtonLink to={ROUTES.demo} trailingIcon={<ArrowRight className="h-4 w-4" />}>
          Try the demo
        </ButtonLink>
        <ButtonLink to={ROUTES.signUp} variant="secondary">
          Create a profile
        </ButtonLink>
      </div>
    </HomeSection>
  );
}
