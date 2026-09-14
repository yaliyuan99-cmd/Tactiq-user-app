import { useRef } from 'react';
import { PageHeader } from '@/components';
import { usePageTitle } from '@/lib/usePageTitle';
import { usePreferences } from '@/services/preferences/PreferencesProvider';
import { CommandMapSection } from './CommandMapSection';
import { CommandTableSection } from './CommandTableSection';
import { ShortcutEditor } from './ShortcutEditor';
import { useShortcutDraft } from './useShortcutDraft';

export default function CommandsPage() {
  usePageTitle('Commands and shortcuts');
  const { preferences, prefersReducedMotion } = usePreferences();
  const draft = useShortcutDraft();
  const editorHeadingRef = useRef<HTMLHeadingElement>(null);

  const goToEditor = () => {
    const heading = editorHeadingRef.current;
    if (!heading) return;
    heading.focus({ preventScroll: true });
    if (typeof heading.scrollIntoView === 'function') {
      heading.scrollIntoView({ block: 'start', behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }
  };

  return (
    <>
      <PageHeader
        title="Commands and shortcuts"
        lede="Eight contact points carry nine commands. Seven are fixed. You can choose what Shortcut 1 and Shortcut 2 do."
      />
      <div className="grid grid-cols-1 gap-12 sm:gap-14">
        <CommandMapSection
          hand={preferences.hand}
          saved={draft.saved}
          dirty={draft.dirty}
          onChangeShortcuts={goToEditor}
        />
        <CommandTableSection mapping={draft.saved.shortcuts} longerInteractionTime={preferences.longerInteractionTime} />
        <ShortcutEditor ref={editorHeadingRef} draft={draft} />
      </div>
    </>
  );
}
