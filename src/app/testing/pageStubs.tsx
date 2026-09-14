/**
 * Test-only stand-ins for the feature pages, so shell and routing tests do not
 * depend on (or break with) other features' screens. Each stub behaves like a
 * real page for the shell: it sets the document title and renders the h1.
 */
import { PageHeader } from '@/components';
import { usePageTitle } from '@/lib/usePageTitle';

export function stubPage(title: string): { default: () => JSX.Element } {
  function StubPage() {
    usePageTitle(title);
    return (
      <>
        <PageHeader title={title} />
        <section id="details" aria-label={`${title} details`}>
          <p>Stub content for {title}.</p>
        </section>
      </>
    );
  }
  return { default: StubPage };
}
