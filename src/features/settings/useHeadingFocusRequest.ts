import { useCallback, useEffect, useState } from 'react';
import { focusSettingsHeading, type SettingsSectionId } from './settingsSections';

/**
 * Returns a function that moves focus to a section's heading after the next
 * commit. Used when the control that had focus disappears (for example
 * "Delete calibration" once there is nothing left to delete). Waiting for the
 * commit lets a closing dialog finish handing focus back first.
 */
export function useHeadingFocusRequest(id: SettingsSectionId): () => void {
  const [requests, setRequests] = useState(0);
  useEffect(() => {
    if (requests > 0) focusSettingsHeading(id);
  }, [requests, id]);
  return useCallback(() => setRequests((count) => count + 1), []);
}
