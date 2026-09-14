import { useLocation } from 'react-router';

/** Test-only: shows the current search string, so tests can check what the page wrote to the URL. */
export function LocationProbe() {
  const { search } = useLocation();
  return <p data-testid="location-search">{search}</p>;
}
