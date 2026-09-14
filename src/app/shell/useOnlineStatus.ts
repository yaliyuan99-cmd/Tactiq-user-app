import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void): () => void {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

function getSnapshot(): boolean {
  return typeof navigator === 'undefined' || typeof navigator.onLine !== 'boolean' ? true : navigator.onLine;
}

function getServerSnapshot(): boolean {
  return true;
}

/** The browser's online flag, updated on "online" / "offline" events. */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
