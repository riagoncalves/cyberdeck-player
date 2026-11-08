export type Route =
  | { view: 'home' }
  | { view: 'search'; query?: string }
  | { view: 'liked' }
  | { view: 'albums' }
  | { view: 'podcasts' }
  | { view: 'queue' }
  | { view: 'library' }
  | { view: 'playlist'; id: string }
  | { view: 'album'; id: string }
  | { view: 'artist'; id: string }
  | { view: 'show'; id: string };

export type Navigate = (route: Route) => void;

/**
 * The page for an artist, album or show reference, judged by its URI: a podcast episode's
 * "artist" and "album" are its show.
 */
export const refRoute = (ref: { id?: string; uri?: string } | null | undefined): Route | null => {
  if (!ref?.id) return null;
  const kind = ref.uri?.split(':')[1];
  if (kind === 'show') return { view: 'show', id: ref.id };
  if (kind === 'album') return { view: 'album', id: ref.id };
  if (kind === 'artist') return { view: 'artist', id: ref.id };
  return null;
};

/** Navigates to refRoute(ref), if there is one. */
export const openRef = (navigate: Navigate, ref: Parameters<typeof refRoute>[0]) => {
  const route = refRoute(ref);
  if (route) navigate(route);
};
