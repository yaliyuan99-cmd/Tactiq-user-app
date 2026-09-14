export type HeadingLevel = 2 | 3 | 4;

/** One level below the given heading, capped at h4. */
export function subLevel(level: 1 | HeadingLevel): HeadingLevel {
  return level >= 3 ? 4 : level === 2 ? 3 : 2;
}
