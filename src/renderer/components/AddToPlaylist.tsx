import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { art, spotify, type Playlist } from '../spotify';
import { refreshPlaylists, useMe, usePlaylists } from '../hooks';
import { Icon } from './Icon';

interface PickerRequest {
  uris: string[];
  /** Opened from one of your playlists: also offer to remove the songs from it. */
  removeFrom?: { playlist: Playlist; onRemoved(): void };
}

const PickerContext = createContext<(request: PickerRequest) => void>(() => undefined);

/** Opens the "add to playlist" picker for some songs. */
export const useAddToPlaylist = () => useContext(PickerContext);

export function AddToPlaylistProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<PickerRequest | null>(null);
  return (
    <PickerContext.Provider value={setRequest}>
      {children}
      {request && <Picker request={request} onClose={() => setRequest(null)} />}
    </PickerContext.Provider>
  );
}

/** Spotify only lets you edit playlists you own or collaborate on. */
const editable = (p: Playlist, userId: string) => p.owner.id === userId || p.collaborative;

function Picker({ request, onClose }: { request: PickerRequest; onClose(): void }) {
  const me = useMe();
  const playlists = usePlaylists();
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const count = request.uris.length;

  const close = useCallback(() => !busy && onClose(), [busy, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    const offBack = window.deck.onBack?.(() => {
      close();
      return true;
    });
    return () => {
      window.removeEventListener('keydown', onKey);
      offBack?.();
    };
  }, [close]);

  const run = async (label: string, action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      setDone(label);
      setTimeout(onClose, 900);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  const add = (p: Playlist) => run(`Added to ${p.name}`, () => spotify.addToPlaylist(p.id, request.uris));

  const create = () => {
    const name = filter.trim() || 'New playlist';
    return run(`Created ${name}`, async () => {
      const playlist = await spotify.createPlaylist(name);
      await spotify.addToPlaylist(playlist.id, request.uris);
      refreshPlaylists();
    });
  };

  const remove = request.removeFrom;
  const query = filter.trim().toLowerCase();
  const list = me ? playlists.filter((p) => editable(p, me.id) && p.name.toLowerCase().includes(query)) : [];

  return (
    <div className='picker' role='dialog' aria-label='Add to playlist' onClick={close}>
      <div className='picker__panel hud' onClick={(e) => e.stopPropagation()}>
        <header className='picker__head'>
          <span className='eyebrow'>{`// add ${count === 1 ? 'song' : `${count} songs`} to playlist`}</span>
          <button className='icon-btn' onClick={close} aria-label='Close'><Icon name='close' size={16} /></button>
        </header>

        {done ? (
          <p className='picker__done'>{`> ${done}`}</p>
        ) : (
          <>
            <label className='searchbox picker__filter'>
              <Icon name='search' size={16} />
              <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder='Find or name a playlist' aria-label='Find a playlist' />
            </label>

            <button className='picker__row picker__new' onClick={create} disabled={busy}>
              <span className='picker__thumb'><Icon name='plus' size={18} /></span>
              <span>New playlist{filter.trim() ? `: "${filter.trim()}"` : ''}</span>
            </button>

            {remove && (
              <button
                className='picker__row picker__remove'
                disabled={busy}
                onClick={() =>
                  run(`Removed from ${remove.playlist.name}`, async () => {
                    await spotify.removeFromPlaylist(remove.playlist.id, request.uris);
                    remove.onRemoved();
                  })
                }
              >
                <span className='picker__thumb'><Icon name='close' size={16} /></span>
                <span>Remove from {remove.playlist.name}</span>
              </button>
            )}

            <ul className='picker__list'>
              {list.map((p) => (
                <li key={p.id}>
                  <button className='picker__row' onClick={() => add(p)} disabled={busy}>
                    <span className='picker__thumb'>{art(p.images, 64) ? <img src={art(p.images, 64)} alt='' loading='lazy' /> : null}</span>
                    <span className='picker__name'>{p.name}</span>
                  </button>
                </li>
              ))}
              {me && !list.length && <li className='empty'>{'// no playlists you can edit match'}</li>}
            </ul>
            {error && <p className='setup__error' role='alert'>{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
