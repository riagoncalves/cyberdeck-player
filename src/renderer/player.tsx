// Playback: the app registers itself as a Spotify Connect device through the Web
// Playback SDK (needs Widevine and Premium), and can also drive any other device.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { art, spotify, type Device, type Track } from './spotify';

export const DEVICE_NAME = 'Cyberdeck Player';

export interface NowPlaying {
  track: Track | null;
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  shuffle: boolean;
  repeat: 'off' | 'track' | 'context';
  volume: number;
  device: Device | null;
  contextUri: string | null;
  updatedAt: number;
}

interface PlayerApi {
  now: NowPlaying;
  /** Our own device id, once the SDK is connected. */
  localDeviceId: string | null;
  sdkStatus: 'loading' | 'ready' | 'unavailable';
  sdkError: string | null;
  error: string | null;
  clearError(): void;
  playContext(contextUri: string, offsetUri?: string): Promise<void>;
  playTracks(uris: string[], index: number): Promise<void>;
  toggle(): Promise<void>;
  next(): Promise<void>;
  previous(): Promise<void>;
  seek(ms: number): Promise<void>;
  setVolume(percent: number): Promise<void>;
  toggleShuffle(): Promise<void>;
  cycleRepeat(): Promise<void>;
  transfer(deviceId: string): Promise<void>;
  refresh(): Promise<void>;
}

const empty: NowPlaying = {
  track: null, isPlaying: false, positionMs: 0, durationMs: 0, shuffle: false, repeat: 'off',
  volume: 60, device: null, contextUri: null, updatedAt: Date.now(),
};

const PlayerContext = createContext<PlayerApi | null>(null);

const loadSdk = () =>
  new Promise<void>((resolve, reject) => {
    if (window.Spotify) return resolve();
    window.onSpotifyWebPlaybackSDKReady = () => resolve();
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.onerror = () => reject(new Error('Could not load the Spotify playback script.'));
    document.body.appendChild(script);
  });

const message = (err: unknown) => {
  const text = err instanceof Error ? err.message : String(err);
  if (/premium/i.test(text)) return 'Playback needs Spotify Premium.';
  if (/NO_ACTIVE_DEVICE|no active device|Device not found/i.test(text)) return 'No active device. Pick one from the device menu.';
  return text;
};

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [now, setNow] = useState<NowPlaying>(empty);
  const [localDeviceId, setLocalDeviceId] = useState<string | null>(null);
  const [sdkStatus, setSdkStatus] = useState<PlayerApi['sdkStatus']>('loading');
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sdk = useRef<Spotify.Player | null>(null);
  const localRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const state = await spotify.state();
      if (!state) {
        setNow((n) => ({ ...n, isPlaying: false, device: null }));
        return;
      }
      setNow({
        track: state.item,
        isPlaying: state.is_playing,
        positionMs: state.progress_ms ?? 0,
        durationMs: state.item?.duration_ms ?? 0,
        shuffle: state.shuffle_state,
        repeat: state.repeat_state,
        volume: state.device.volume_percent ?? 60,
        device: state.device,
        contextUri: state.context?.uri ?? null,
        updatedAt: Date.now(),
      });
    } catch {
      /* transient: the next poll retries */
    }
  }, []);

  // Connect the in-app device.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const drm = await window.deck.drm();
      if (!drm.ready) {
        setSdkStatus('unavailable');
        setSdkError(drm.detail);
        return;
      }
      try {
        await loadSdk();
      } catch (err) {
        setSdkStatus('unavailable');
        setSdkError(message(err));
        return;
      }
      if (cancelled) return;
      const player = new window.Spotify.Player({
        name: DEVICE_NAME,
        getOAuthToken: (cb) => window.deck.token().then(cb),
        volume: 0.6,
      });
      player.addListener('ready', ({ device_id }) => {
        localRef.current = device_id;
        setLocalDeviceId(device_id);
        setSdkStatus('ready');
      });
      player.addListener('not_ready', () => setSdkStatus('loading'));
      player.addListener('initialization_error', ({ message: m }) => { setSdkStatus('unavailable'); setSdkError(m); });
      player.addListener('authentication_error', ({ message: m }) => { setSdkStatus('unavailable'); setSdkError(m); });
      player.addListener('account_error', () => { setSdkStatus('unavailable'); setSdkError('In-app playback needs Spotify Premium.'); });
      player.addListener('playback_error', ({ message: m }) => setError(m));
      player.addListener('player_state_changed', (state) => {
        if (!state) return;
        const t = state.track_window.current_track;
        setNow((n) => ({
          ...n,
          track: t
            ? {
                id: t.id ?? '', name: t.name, uri: t.uri, duration_ms: t.duration_ms,
                artists: t.artists.map((a) => ({ id: a.uri.split(':').pop() ?? '', name: a.name, uri: a.uri })),
                album: { id: t.album.uri.split(':').pop() ?? '', name: t.album.name, uri: t.album.uri, images: t.album.images.map((i) => ({ url: i.url, width: i.width, height: i.height })) },
              }
            : null,
          isPlaying: !state.paused,
          positionMs: state.position,
          durationMs: state.duration,
          shuffle: state.shuffle,
          repeat: (['off', 'context', 'track'] as const)[state.repeat_mode] ?? 'off',
          contextUri: state.context?.uri ?? null,
          device: { id: localRef.current, name: DEVICE_NAME, type: 'Computer', is_active: true, volume_percent: n.volume },
          updatedAt: Date.now(),
        }));
      });
      await player.connect();
      sdk.current = player;
    })();
    return () => {
      cancelled = true;
      sdk.current?.disconnect();
    };
  }, []);

  // Poll the Web API for other devices (and as a safety net for ours).
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 4000);
    return () => clearInterval(id);
  }, [refresh]);

  // Advance the progress bar between updates.
  useEffect(() => {
    if (!now.isPlaying) return;
    const id = setInterval(() => {
      setNow((n) => (n.isPlaying ? { ...n, positionMs: Math.min(n.durationMs, n.positionMs + (Date.now() - n.updatedAt)), updatedAt: Date.now() } : n));
    }, 500);
    return () => clearInterval(id);
  }, [now.isPlaying]);

  const run = useCallback(async (fn: () => Promise<unknown>) => {
    try {
      setError(null);
      await fn();
      setTimeout(refresh, 400);
    } catch (err) {
      setError(message(err));
    }
  }, [refresh]);

  /** The device to start playback on: the active one, or our own. */
  const target = useCallback(() => (now.device?.is_active && now.device.id ? now.device.id : localRef.current ?? undefined), [now.device]);

  const api = useMemo<PlayerApi>(() => ({
    now, localDeviceId, sdkStatus, sdkError, error,
    clearError: () => setError(null),
    playContext: (contextUri, offsetUri) =>
      run(() => spotify.play(target(), { context_uri: contextUri, ...(offsetUri ? { offset: { uri: offsetUri } } : {}) })),
    playTracks: (uris, index) => run(() => spotify.play(target(), { uris: uris.slice(0, 100), offset: { position: Math.min(index, 99) } })),
    toggle: () => run(async () => {
      if (now.device?.id === localRef.current && sdk.current) return sdk.current.togglePlay();
      return now.isPlaying ? spotify.pause() : spotify.play(target());
    }),
    next: () => run(() => spotify.next()),
    previous: () => run(() => spotify.previous()),
    seek: (ms) => {
      setNow((n) => ({ ...n, positionMs: ms, updatedAt: Date.now() }));
      return run(() => spotify.seek(ms));
    },
    setVolume: (percent) => {
      setNow((n) => ({ ...n, volume: percent }));
      if (now.device?.id === localRef.current && sdk.current) return sdk.current.setVolume(percent / 100);
      return run(() => spotify.volume(percent));
    },
    toggleShuffle: () => run(() => spotify.shuffle(!now.shuffle)),
    cycleRepeat: () => run(() => spotify.repeat(now.repeat === 'off' ? 'context' : now.repeat === 'context' ? 'track' : 'off')),
    transfer: (deviceId) => run(() => spotify.transfer(deviceId, true)),
    refresh,
  }), [now, localDeviceId, sdkStatus, sdkError, error, run, target, refresh]);

  // Android: mirror in-app playback in the system media notification (lock screen, headset buttons).
  const playingHere = !!localDeviceId && now.device?.id === localDeviceId && !!now.track;
  const mediaKey = playingHere ? `${now.track?.uri}|${now.isPlaying}` : '';
  useEffect(() => {
    const media = window.deck.media;
    if (!media) return;
    if (!mediaKey || !now.track) return media.update(null);
    media.update({
      title: now.track.name,
      artist: now.track.artists.map((a) => a.name).join(', '),
      artUrl: art(now.track.album?.images, 300) ?? null,
      playing: now.isPlaying,
    });
    // Only when the track or play state changes, not on every progress tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaKey]);

  const apiRef = useRef(api);
  apiRef.current = api;
  useEffect(
    () =>
      window.deck.media?.onAction((action) => {
        const p = apiRef.current;
        if (action === 'next') p.next();
        else if (action === 'previous') p.previous();
        else if ((action === 'play') !== p.now.isPlaying) p.toggle();
      }),
    [],
  );

  return <PlayerContext.Provider value={api}>{children}</PlayerContext.Provider>;
}

export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside PlayerProvider');
  return ctx;
};
