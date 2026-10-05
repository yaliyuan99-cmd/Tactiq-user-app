import { useEffect, useRef, useState } from 'react';
import { Activity } from 'lucide-react';
import { ButtonLink, Callout, EmptyState, PAGE_TITLE_ID, PageHeader } from '@/components';
import { ROUTES } from '@/app/routes';
import { usePageTitle } from '@/lib/usePageTitle';
import { useFeedback } from '@/services/feedback/FeedbackProvider';
import type { HistoryService } from '@/services/history/types';
import { useHistory } from '@/services/ServicesProvider';
import { CommandPerformanceSection } from './CommandPerformanceSection';
import { EvidenceBanner } from './EvidenceBanner';
import { FiltersForm } from './FiltersForm';
import { HISTORY_HEADING_IDS } from './historyIds';
import { toServiceFilter, type HistoryFilterState } from './historyParams';
import { NoMatchingActivity } from './NoMatchingActivity';
import { performanceRows } from './performance';
import { RecentAttemptsSection } from './RecentAttemptsSection';
import { SummarySection } from './SummarySection';
import { useHistoryFilters } from './useHistoryFilters';
import { YourDataSection } from './YourDataSection';
import { countEmergencyHolds, plural, resultCountMessage } from './wording';

export const HISTORY_TITLE = 'History';

export const HISTORY_LEDE =
  'Your practice in the simulator, lessons and calibration. Each record is labelled Simulated, or Measured when it came from a connected bench ring.';

export const STORAGE_WARNING = 'This browser is not saving activity, so it will be lost when you close the tab.';

/**
 * The first read parses and validates every stored record; it runs after the
 * first paint so the page can say it is loading. Later reads use the cache.
 */
function useInitialRead(history: HistoryService): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    history.count();
    setReady(true);
  }, [history]);
  return ready;
}

/** Demo Mode sample records anywhere in history, whatever the filters. */
function countSampleRecords(history: HistoryService): number {
  return history.list({ range: 'all' }).filter((event) => event.seeded).length;
}

/** Moves focus to an element id after the next render, e.g. when the focused control has gone. */
function useFocusAfterRender(): (id: string) => void {
  const pending = useRef<string | null>(null);
  useEffect(() => {
    const id = pending.current;
    if (id === null) return;
    pending.current = null;
    document.getElementById(id)?.focus();
  });
  return (id: string) => {
    pending.current = id;
  };
}

export default function HistoryPage() {
  // The page is named the same everywhere: the sidebar and the More dialog say
  // "History", so the document title, the h1 and the route announcement do too.
  usePageTitle(HISTORY_TITLE);
  const history = useHistory();
  const { announce } = useFeedback();
  const { filters, setFilters, searchFor } = useHistoryFilters();
  const ready = useInitialRead(history);
  const focusAfterRender = useFocusAfterRender();

  const header = <PageHeader title={HISTORY_TITLE} lede={HISTORY_LEDE} />;
  if (!ready) {
    return (
      <>
        {header}
        <p role="status" className="text-muted-foreground">
          Loading activity…
        </p>
      </>
    );
  }

  const serviceFilter = toServiceFilter(filters);
  const total = history.count();
  const events = history.list(serviceFilter);
  const summary = history.summarise(serviceFilter);
  const emergency = countEmergencyHolds(events);
  const sampleCount = countSampleRecords(history);
  // Every evidence statement on the page describes the records in view, so the
  // lede, the banner, Summary and By command can never disagree with the rows.
  const allSamples = events.length > 0 && events.every((event) => event.seeded);
  const filterKey = `${filters.range}|${filters.command}|${filters.source}`;

  const announceResults = (next: HistoryFilterState) => {
    announce(resultCountMessage(history.list(toServiceFilter(next))));
  };

  const changeFilters = (patch: Partial<HistoryFilterState>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    announceResults(next);
  };

  const removeSamples = () => {
    // One write that keeps the user's own records, in order; sample records are not seeded again.
    const removed = history.removeSeeded();
    if (removed === 0) return;
    announce(`Removed ${plural(removed, 'sample record')}.`);
    // With nothing left the filters go away too, so focus moves to the page title.
    focusAfterRender(history.count() > 0 ? HISTORY_HEADING_IDS.filters : PAGE_TITLE_ID);
  };

  return (
    <>
      {header}
      {!history.lastWriteSucceeded() && (
        <Callout kind="warning" className="mb-4">
          {STORAGE_WARNING}
        </Callout>
      )}

      {total === 0 ? (
        <EmptyState
          icon={Activity}
          title="No activity yet"
          body="Attempts from the simulator, lessons and calibration will appear here. Each one is labelled Simulated, or Measured when it came from a connected bench ring."
          action={
            <>
              <ButtonLink to={ROUTES.simulator}>Practise a command</ButtonLink>
              <ButtonLink to={ROUTES.train} variant="secondary">
                Start a lesson
              </ButtonLink>
            </>
          }
        />
      ) : (
        <div className="space-y-10">
          <div className="space-y-4">
            <EvidenceBanner
              evidence={summary.evidence}
              allSamples={allSamples}
              sampleCount={sampleCount}
              onRemoveSamples={removeSamples}
            />
            <FiltersForm filters={filters} onChange={changeFilters} />
          </div>

          {events.length === 0 ? (
            <NoMatchingActivity
              filters={filters}
              searchFor={searchFor}
              onFollowFilterLink={(next) => {
                announceResults(next);
                focusAfterRender(HISTORY_HEADING_IDS.filters);
              }}
            />
          ) : (
            <>
              <SummarySection summary={summary} emergency={emergency} allSamples={allSamples} />
              <CommandPerformanceSection
                rows={performanceRows(summary.perCommand, filters.command)}
                command={filters.command}
                emergency={emergency}
                evidence={summary.evidence}
                allSamples={allSamples}
              />
              <RecentAttemptsSection key={filterKey} events={events} />
            </>
          )}

          <YourDataSection onCleared={() => focusAfterRender(PAGE_TITLE_ID)} />
        </div>
      )}
    </>
  );
}
