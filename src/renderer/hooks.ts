import { useCallback, useEffect, useState } from 'react';
import { spotify, type Playlist, type User } from './spotify';

/** Runs an async loader whenever `deps` change; exposes data, error and loading. */
export function useAsync<T>(load: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ data: T | null; error: string | null; loading: boolean }>({
    data: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    load()
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((err: Error) => alive && setState({ data: null, error: err.message, loading: false }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}

/** Liked state for a set of track URIs, with an optimistic toggle. */
export function useLiked(uris: string[]) {
  const key = uris.join(',');
  const [liked, setLiked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let alive = true;
    const list = key ? key.split(',') : [];
    const chunks: string[][] = [];
    for (let i = 0; i < list.length; i += 40) chunks.push(list.slice(i, i + 40));
    Promise.all(chunks.map((c) => spotify.contains(c).then((flags) => c.map((uri, i) => [uri, flags[i]] as const))))
      .then((pairs) => alive && setLiked(Object.fromEntries(pairs.flat())))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [key]);

  const toggle = useCallback(async (uri: string) => {
    const wasLiked = liked[uri];
    setLiked((l) => ({ ...l, [uri]: !wasLiked }));
    try {
      await (wasLiked ? spotify.remove([uri]) : spotify.save([uri]));
    } catch {
      setLiked((l) => ({ ...l, [uri]: wasLiked }));
    }
  }, [liked]);

  return { liked, toggle };
}

/** Tracks a CSS media query. */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

/** Phone layout: bottom tabs and a mini player instead of the sidebar and player bar. */
export const MOBILE_QUERY = '(max-width: 760px) and (orientation: portrait)';
export const useMobile = () => useMediaQuery(MOBILE_QUERY);

/** Car / tablet-sideways layout: a short landscape touchscreen, e.g. a head unit (about 1024x600). */
export const CAR_QUERY = '(orientation: landscape) and (max-height: 820px) and (pointer: coarse)';
export const useCar = () => useMediaQuery(CAR_QUERY);

// The user's playlists, shared by the sidebar, the Library and the add-to-playlist picker.
let playlistsCache: Promise<Playlist[]> | null = null;
const PLAYLISTS_CHANGED = 'deck:playlists-changed';

const loadPlaylists = () =>
  (playlistsCache ??= (async () => {
    const all: Playlist[] = [];
    for (let offset = 0; offset < 500; offset += 50) {
      const page = await spotify.playlists(offset);
      all.push(...page.items.filter(Boolean));
      if (!page.next) break;
    }
    return all;
  })().catch((err) => {
    playlistsCache = null;
    throw err;
  }));

/** Reloads every playlist list, e.g. after creating one. */
export const refreshPlaylists = () => {
  playlistsCache = null;
  window.dispatchEvent(new Event(PLAYLISTS_CHANGED));
};

/** All of the user's playlists (up to 500). */
export function usePlaylists() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  useEffect(() => {
    let alive = true;
    const load = () => loadPlaylists().then((list) => alive && setPlaylists(list)).catch(() => undefined);
    load();
    window.addEventListener(PLAYLISTS_CHANGED, load);
    return () => {
      alive = false;
      window.removeEventListener(PLAYLISTS_CHANGED, load);
    };
  }, []);
  return playlists;
}

let meCache: Promise<User> | null = null;

/** The signed-in user, fetched once. */
export function useMe() {
  const [me, setMe] = useState<User | null>(null);
  useEffect(() => {
    let alive = true;
    (meCache ??= spotify.me().catch((err) => {
      meCache = null;
      throw err;
    }))
      .then((u) => alive && setMe(u))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return me;
}
