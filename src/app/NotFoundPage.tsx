import { House } from 'lucide-react';
import { useLocation } from 'react-router';
import { ROUTES } from '@/app/routes';
import { ButtonLink, PageHeader } from '@/components';
import { usePageTitle } from '@/lib/usePageTitle';

export const NOT_FOUND_TITLE = 'Page not found';

/** Shown for any address the app does not know, inside the shell when signed in under /dashboard. */
export default function NotFoundPage() {
  usePageTitle(NOT_FOUND_TITLE);
  const { pathname } = useLocation();
  return (
    <>
      <PageHeader
        title={NOT_FOUND_TITLE}
        lede={
          <>
            There is no page at <code className="break-all font-mono text-base text-foreground">{pathname}</code>. The
            address may be mistyped, or the page may have moved.
          </>
        }
      />
      <ButtonLink to={ROUTES.dashboard} leadingIcon={<House className="h-5 w-5" />}>
        Go to the dashboard
      </ButtonLink>
    </>
  );
}
