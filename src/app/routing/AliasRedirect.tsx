import { Navigate, useLocation, useParams } from 'react-router';
import { fillParams } from './aliases';
import { sectionPath, withLocation, type SectionId } from './sections';

export interface AliasRedirectProps {
  /** The canonical /dashboard-based target. May contain ":param" tokens. */
  readonly to: string;
  /** Which section the visitor is in, so a demonstration stays in /demo. */
  readonly section?: SectionId;
}

/**
 * Sends an alias address to its canonical one, keeping the query and the hash
 * and replacing the history entry so Back does not land on the alias again.
 */
export function AliasRedirect({ to, section = 'account' }: AliasRedirectProps) {
  const { search, hash } = useLocation();
  const params = useParams();
  const target = sectionPath(section, fillParams(to, params));
  return <Navigate to={withLocation(target, { search, hash })} replace />;
}
