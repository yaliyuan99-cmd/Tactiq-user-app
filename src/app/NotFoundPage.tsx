import { House } from 'lucide-react';
import { useLocation } from 'react-router';
import { ROUTES } from '@/app/routes';
import { isDemoPath } from '@/app/routing/sections';
import { ButtonLink, PageHeader } from '@/components';
import { usePageTitle } from '@/lib/usePageTitle';
import { useAuth } from '@/services/auth/AuthProvider';

export const NOT_FOUND_TITLE = 'Page not found';

/** Where "back" goes from an unknown address: wherever the visitor already was. */
function backTo(pathname: string, signedIn: boolean): { readonly to: string; readonly label: string } {
  if (isDemoPath(pathname)) return { to: ROUTES.demo, label: 'Back to the demonstration' };
  if (signedIn) return { to: ROUTES.dashboard, label: 'Go to the dashboard' };
  return { to: ROUTES.root, label: 'Go to the home page' };
}

/**
 * Shown for any address the app does not know: on its own under the public
 * frame, and inside the shell for an unknown account or demonstration page, so
 * the navigation stays usable.
 */
export default function NotFoundPage() {
  usePageTitle(NOT_FOUND_TITLE);
  const { pathname } = useLocation();
  const { user } = useAuth();
  const back = backTo(pathname, user !== null);
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
      <ButtonLink to={back.to} leadingIcon={<House className="h-5 w-5" />}>
        {back.label}
      </ButtonLink>
    </>
  );
}
