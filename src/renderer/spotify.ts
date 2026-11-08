// Spotify Web API client. Only endpoints that still exist for Development Mode
// apps after the February 2026 changes are used (e.g. /playlists/{id}/items, /me/library).
import type { DeckApi } from '../shared/ipc';

declare global {
  interface Window {
    deck: DeckApi;
  }
}

export interface Image { url: string; width?: number | null; height?: number | null }
export interface ArtistRef { id: string; name: string; uri: string }
export interface AlbumRef { id: string; name: string; uri: string; images: Image[]; release_date?: string; album_type?: string; artists?: ArtistRef[]; total_tracks?: number }
export interface Track { id: string; name: string; uri: string; duration_ms: number; explicit?: boolean; artists: ArtistRef[]; album?: AlbumRef; track_number?: number; is_local?: boolean }
export interface Artist { id: string; name: string; uri: string; images?: Image[]; genres?: string[] }
export interface Playlist { id: string; name: string; uri: string; description?: string | null; images: Image[] | null; owner: { id: string; display_name?: string }; collaborative?: boolean }
export interface Device { id: string | null; name: string; type: string; is_active: boolean; volume_percent: number | null; supports_volume?: boolean }
export interface Paging<T> { items: T[]; next: string | null; total: number; offset: number; limit: number }
export interface User { id: string; display_name: string | null; images?: Image[] }
export interface Show { id: string; name: string; uri: string; images: Image[]; description?: string; total_episodes?: number }
export interface Episode {
  type: 'episode';
  id: string;
  name: string;
  uri: string;
  duration_ms: number;
  explicit?: boolean;
  images: Image[];
  release_date?: string;
  description?: string;
  resume_point?: { fully_played: boolean; resume_position_ms: number };
  show?: Show;
}
export interface PlaybackState {
  device: Device;
  is_playing: boolean;
  shuffle_state: boolean;
  repeat_state: 'off' | 'track' | 'context';
  progress_ms: number | null;
  item: Track | null;
  context: { uri: string; type: string } | null;
}

/**
 * Episodes in the player and queue are shown like tracks: the show stands in for the
 * artist and the album, so links from them open the show.
 */
export const episodeAsTrack = (e: Episode, show = e.show): Track => {
  const showRef = { id: show?.id ?? '', name: show?.name ?? 'Podcast', uri: show?.uri ?? '' };
  return {
    id: e.id,
    name: e.name,
    uri: e.uri,
    duration_ms: e.duration_ms,
    explicit: e.explicit,
    artists: [showRef],
    album: { ...showRef, images: e.images?.length ? e.images : show?.images ?? [] },
  };
};

const asTrack = (item: Track | Episode | null | undefined): Track | null =>
  !item ? null : 'type' in item && item.type === 'episode' ? episodeAsTrack(item) : (item as Track);

export class SpotifyError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const API = 'https://api.spotify.com/v1';

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const token = await window.deck.token();
  const res = await fetch(path.startsWith('http') ? path : `${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers },
  });
  if (res.status === 429 && retry) {
    const wait = Number(res.headers.get('Retry-After') ?? 1);
    await new Promise((r) => setTimeout(r, Math.min(wait, 10) * 1000));
    return request<T>(path, init, false);
  }
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body?.error?.message ?? body?.error_description ?? message;
    } catch {
      /* empty body */
    }
    throw new SpotifyError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  // Player commands (play, pause, next, queue...) can answer 200 with a
  // non-JSON body; the call succeeded, so there's simply nothing to return.
  const text = await res.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined as T;
  }
}

const q = (params: Record<string, string | number | undefined>) =>
  new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString();

export const spotify = {
  get: request,
  me: () => request<User>('/me'),

  // Library
  playlists: (offset = 0) => request<Paging<Playlist>>(`/me/playlists?${q({ limit: 50, offset })}`),
  likedTracks: (offset = 0) => request<Paging<{ added_at: string; track: Track }>>(`/me/tracks?${q({ limit: 50, offset })}`),
  savedAlbums: (offset = 0) => request<Paging<{ album: AlbumRef }>>(`/me/albums?${q({ limit: 50, offset })}`),
  followedArtists: () => request<{ artists: Paging<Artist> }>(`/me/following?${q({ type: 'artist', limit: 50 })}`),
  recentlyPlayed: (limit = 30) =>
    request<{ items: { track: Track; played_at: string; context: { uri: string } | null }[] }>(`/me/player/recently-played?${q({ limit })}`),
  topTracks: () => request<Paging<Track>>(`/me/top/tracks?${q({ limit: 20, time_range: 'short_term' })}`),
  topArtists: () => request<Paging<Artist>>(`/me/top/artists?${q({ limit: 12, time_range: 'medium_term' })}`),
  contains: (uris: string[]) =>
    uris.length ? request<boolean[]>(`/me/library/contains?${q({ uris: uris.slice(0, 40).join(',') })}`) : Promise.resolve([]),
  save: (uris: string[]) => request<void>(`/me/library?${q({ uris: uris.join(',') })}`, { method: 'PUT' }),
  remove: (uris: string[]) => request<void>(`/me/library?${q({ uris: uris.join(',') })}`, { method: 'DELETE' }),

  // Catalogue
  playlist: (id: string) => request<Playlist & { items?: Paging<{ item: Track | null }> }>(`/playlists/${id}`),
  playlistItems: (id: string, offset = 0) =>
    request<Paging<{ item: Track | null; added_at: string }>>(`/playlists/${id}/items?${q({ limit: 50, offset })}`),
  // Editing: only your own (or collaborative) playlists.
  addToPlaylist: (id: string, uris: string[]) =>
    request<{ snapshot_id: string }>(`/playlists/${id}/items`, { method: 'POST', body: JSON.stringify({ uris: uris.slice(0, 100) }) }),
  removeFromPlaylist: (id: string, uris: string[]) =>
    request<{ snapshot_id: string }>(`/playlists/${id}/items`, {
      method: 'DELETE',
      body: JSON.stringify({ items: uris.slice(0, 100).map((uri) => ({ uri })) }),
    }),
  createPlaylist: (name: string) => request<Playlist>('/me/playlists', { method: 'POST', body: JSON.stringify({ name, public: false }) }),

  album: (id: string) => request<AlbumRef & { tracks: Paging<Track>; artists: ArtistRef[] }>(`/albums/${id}`),
  albumTracks: (id: string, offset = 0) => request<Paging<Track>>(`/albums/${id}/tracks?${q({ limit: 50, offset })}`),
  artist: (id: string) => request<Artist>(`/artists/${id}`),
  // This endpoint caps limit at 10, so fetch the first page, then the rest (up to `max`) in parallel.
  artistAlbums: async (id: string, max = 50): Promise<AlbumRef[]> => {
    const page = (offset: number) =>
      request<Paging<AlbumRef>>(`/artists/${id}/albums?${q({ include_groups: 'album,single', limit: 10, offset })}`);
    const first = await page(0);
    const offsets: number[] = [];
    for (let o = 10; o < Math.min(first.total, max); o += 10) offsets.push(o);
    const rest = await Promise.all(offsets.map(page));
    return [first, ...rest].flatMap((p) => p.items);
  },
  search: (query: string) =>
    request<{
      tracks?: Paging<Track>;
      albums?: Paging<AlbumRef>;
      artists?: Paging<Artist>;
      playlists?: Paging<Playlist | null>;
      shows?: Paging<Show | null>;
      episodes?: Paging<Episode | null>;
    }>(`/search?${q({ q: query, type: 'track,album,artist,playlist,show,episode', limit: 10 })}`),

  // Podcasts
  show: (id: string) => request<Show>(`/shows/${id}`),
  showEpisodes: (id: string, offset = 0) => request<Paging<Episode | null>>(`/shows/${id}/episodes?${q({ limit: 50, offset })}`),
  savedShows: (offset = 0) => request<Paging<{ show: Show }>>(`/me/shows?${q({ limit: 50, offset })}`),
  savedEpisodes: (offset = 0) => request<Paging<{ episode: Episode }>>(`/me/episodes?${q({ limit: 50, offset })}`),

  // Player (additional_types=episode: otherwise a playing podcast comes back as nothing)
  state: async () => {
    const state = await request<(Omit<PlaybackState, 'item'> & { item: Track | Episode | null }) | undefined>(
      `/me/player?${q({ additional_types: 'track,episode' })}`,
    );
    return state ? { ...state, item: asTrack(state.item) } : undefined;
  },
  devices: () => request<{ devices: Device[] }>('/me/player/devices'),
  queue: async () => {
    const res = await request<{ currently_playing: Track | Episode | null; queue: (Track | Episode)[] }>(
      `/me/player/queue?${q({ additional_types: 'track,episode' })}`,
    );
    return { currently_playing: asTrack(res?.currently_playing), queue: (res?.queue ?? []).map(asTrack).filter((t): t is Track => !!t) };
  },
  transfer: (deviceId: string, play = true) =>
    request<void>('/me/player', { method: 'PUT', body: JSON.stringify({ device_ids: [deviceId], play }) }),
  play: (deviceId: string | undefined, body?: { context_uri?: string; uris?: string[]; offset?: { uri?: string; position?: number } }) =>
    request<void>(`/me/player/play?${q({ device_id: deviceId })}`, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  pause: () => request<void>('/me/player/pause', { method: 'PUT' }),
  next: () => request<void>('/me/player/next', { method: 'POST' }),
  previous: () => request<void>('/me/player/previous', { method: 'POST' }),
  seek: (ms: number) => request<void>(`/me/player/seek?${q({ position_ms: Math.round(ms) })}`, { method: 'PUT' }),
  volume: (percent: number) => request<void>(`/me/player/volume?${q({ volume_percent: Math.round(percent) })}`, { method: 'PUT' }),
  shuffle: (on: boolean) => request<void>(`/me/player/shuffle?${q({ state: String(on) })}`, { method: 'PUT' }),
  repeat: (mode: 'off' | 'track' | 'context') => request<void>(`/me/player/repeat?${q({ state: mode })}`, { method: 'PUT' }),
  enqueue: (uri: string) => request<void>(`/me/player/queue?${q({ uri })}`, { method: 'POST' }),
};

interface EmbedTrack {
  uri: string;
  title: string;
  subtitle?: string;
  duration?: number;
  isExplicit?: boolean;
  isPlayable?: boolean;
}

/**
 * The songs of a playlist you don't own (the Web API now withholds them), read from the
 * playlist's public embed widget. Unofficial: the page can change at any time, private
 * playlists have no embed, and it lists the first 100 songs only. There are no artist or
 * album IDs, so those don't link anywhere.
 */
export const embedPlaylistTracks = async (id: string): Promise<Track[]> => {
  const html = await window.deck.playlistEmbed(id);
  const json = new DOMParser().parseFromString(html, 'text/html').getElementById('__NEXT_DATA__')?.textContent;
  if (!json) throw new Error('No track data in the embed page.');
  const list: EmbedTrack[] | undefined = JSON.parse(json)?.props?.pageProps?.state?.data?.entity?.trackList;
  if (!Array.isArray(list)) throw new Error('No track list in the embed page.');
  return list
    .filter((t) => t.uri?.startsWith('spotify:track:'))
    .map((t) => ({
      id: t.uri.split(':')[2],
      name: t.title,
      uri: t.uri,
      duration_ms: t.duration ?? 0,
      explicit: t.isExplicit,
      artists: (t.subtitle ?? '').split(/,\s*/).filter(Boolean).map((name) => ({ id: '', name, uri: '' })),
    }));
};

export const art = (images: Image[] | null | undefined, min = 0): string | undefined => {
  if (!images?.length) return undefined;
  const sorted = [...images].sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  return (sorted.find((i) => (i.width ?? 640) >= min) ?? sorted[sorted.length - 1]).url;
};

export const duration = (ms: number) => {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
};
