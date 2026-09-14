import { useLocation } from 'react-router';

/** Exposes the router pathname to tests as data-pathname. */
export function LocationProbe() {
  const { pathname } = useLocation();
  return <div hidden data-testid="location" data-pathname={pathname} />;
}
