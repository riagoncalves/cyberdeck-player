import { useCallback, useEffect, useRef, useState } from 'react';
import type { AuthStatus } from '../shared/ipc';
import type { Route } from './routes';
import { spotify, type User } from './spotify';
import { PlayerProvider, usePlayer } from './player';
import { useCar, useMobile } from './hooks';
import { AddToPlaylistProvider } from './components/AddToPlaylist';
import { CarNav } from './components/CarNav';
import { CarPanel } from './components/CarPanel';
import { MobileNav } from './components/MobileNav';
import { MobilePlayer } from './components/MobilePlayer';
import { PlayerBar } from './components/PlayerBar';
import { Setup } from './components/Setup';
import { Sidebar } from './components/Sidebar';
import { TitleBar } from './components/TitleBar';
import { Albums } from './views/Albums';
import { AlbumView } from './views/AlbumView';
import { ArtistView } from './views/ArtistView';
import { Home } from './views/Home';
import { Library } from './views/Library';
import { Liked } from './views/Liked';
import { PlaylistView } from './views/PlaylistView';
import { Podcasts } from './views/Podcasts';
import { ShowView } from './views/ShowView';
import { Queue } from './views/Queue';
import { Search } from './views/Search';

function Toast() {
  const { error, clearError } = usePlayer();
  useEffect(() => {
    if (!error) return;
    const id = setTimeout(clearError, 6000);
    return () => clearTimeout(id);
  }, [error, clearError]);
  if (!error) return null;
  return (
    <div className='toast hud' role='alert' onClick={clearError}>
      <span className='eyebrow'>{'// warning'}</span>
      {error}
    </div>
  );
}

function Deck({ onLogout }: { onLogout(): void }) {
  const player = usePlayer();
  const [history, setHistory] = useState<Route[]>([{ view: 'home' }]);
  const [index, setIndex] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [expanded, setExpanded] = useState(false);
  const car = useCar();
  const mobile = useMobile() && !car;
  const route = history[index];

  useEffect(() => {
    spotify.me().then(setUser).catch(() => undefined);
  }, []);

  const navigate = useCallback(
    (next: Route) => {
      setHistory((h) => [...h.slice(0, index + 1), next]);
      setIndex((i) => i + 1);
      document.querySelector('.main')?.scrollTo({ top: 0 });
    },
    [index],
  );

  // Space toggles playback unless you're typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement).closest('input, textarea');
      if (e.code === 'Space' && !typing) {
        e.preventDefault();
        player.toggle();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        navigate({ view: 'search' });
      }
      if (e.altKey && e.key === 'ArrowLeft' && index > 0) setIndex(index - 1);
      if (e.altKey && e.key === 'ArrowRight' && index < history.length - 1) setIndex(index + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [player, navigate, index, history.length]);

  // Android back gesture: close the now-playing view, then walk back through history.
  // Registered once (state via a ref) so dialogs opened later stay first in line.
  const backState = useRef({ expanded, index });
  backState.current = { expanded, index };
  useEffect(
    () =>
      window.deck.onBack?.(() => {
        if (backState.current.expanded) {
          setExpanded(false);
          return true;
        }
        if (backState.current.index > 0) {
          setIndex(backState.current.index - 1);
          return true;
        }
        return false;
      }),
    [],
  );

  const view = (() => {
    switch (route.view) {
      case 'home': return <Home navigate={navigate} />;
      case 'search': return <Search navigate={navigate} initial={route.query} />;
      case 'liked': return <Liked navigate={navigate} user={user} />;
      case 'albums': return <Albums navigate={navigate} />;
      case 'queue': return <Queue navigate={navigate} />;
      case 'podcasts': return <Podcasts navigate={navigate} />;
      case 'show': return <ShowView key={route.id} id={route.id} navigate={navigate} />;
      case 'library': return <Library navigate={navigate} user={user} onLogout={onLogout} />;
      case 'playlist': return <PlaylistView key={route.id} id={route.id} navigate={navigate} />;
      case 'album': return <AlbumView key={route.id} id={route.id} navigate={navigate} />;
      case 'artist': return <ArtistView key={route.id} id={route.id} navigate={navigate} />;
    }
  })();

  const back = () => setIndex((i) => Math.max(0, i - 1));

  if (car) {
    return (
      <div className='deck deck--car'>
        <CarNav route={route} navigate={navigate} canBack={index > 0} onBack={back} />
        <main className='main'>{view}</main>
        <CarPanel navigate={navigate} />
        <Toast />
      </div>
    );
  }

  return (
    <div className='deck'>
      <TitleBar
        canBack={index > 0}
        canForward={index < history.length - 1}
        onBack={back}
        onForward={() => setIndex((i) => Math.min(history.length - 1, i + 1))}
      />
      {!mobile && <Sidebar route={route} navigate={navigate} user={user} onLogout={onLogout} />}
      <main className='main'>{view}</main>
      {mobile ? (
        <div className='bottom'>
          <MobilePlayer navigate={navigate} expanded={expanded} onExpand={setExpanded} />
          <MobileNav route={route} navigate={navigate} />
        </div>
      ) : (
        <PlayerBar navigate={navigate} />
      )}
      <Toast />
    </div>
  );
}

export function App() {
  const [status, setStatus] = useState<AuthStatus | null>(null);

  const refresh = useCallback(() => {
    window.deck.status().then(setStatus);
  }, []);

  useEffect(refresh, [refresh]);

  if (!status) return <div className='boot'><span className='blink'>▮</span> booting deck…</div>;

  if (!status.signedIn) {
    return (
      <>
        {window.deck.platform === 'desktop' && (
          <div className='titlebar titlebar--bare'>
            <span />
            <div className='titlebar__controls'>
              <button className='icon-btn is-danger' onClick={() => window.deck.window.close()} aria-label='Close'>✕</button>
            </div>
          </div>
        )}
        <Setup onDone={refresh} reauth={status.needsReauth} />
      </>
    );
  }

  return (
    <PlayerProvider>
      <AddToPlaylistProvider>
      <Deck
        onLogout={async () => {
          await window.deck.logout();
          refresh();
        }}
      />
      </AddToPlaylistProvider>
    </PlayerProvider>
  );
}
