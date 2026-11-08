import { useState, type CSSProperties } from 'react';
import { refRoute, type Navigate } from '../routes';
import { art, duration, spotify } from '../spotify';
import { useAsync, useLiked } from '../hooks';
import { usePlayer } from '../player';
import { useAddToPlaylist } from './AddToPlaylist';
import { Icon } from './Icon';
import { DeviceMenu } from './PlayerBar';

interface MobilePlayerProps {
  navigate: Navigate;
  expanded: boolean;
  onExpand(expanded: boolean): void;
}

/** Phone layout: a mini player above the tabs that opens a full-screen "now playing" view. */
export function MobilePlayer({ navigate, expanded, onExpand }: MobilePlayerProps) {
  const player = usePlayer();
  const { now } = player;
  const track = now.track;
  const { liked, toggle } = useLiked(track && track.id ? [track.uri] : []);
  const addToPlaylist = useAddToPlaylist();
  const [scrub, setScrub] = useState<number | null>(null);
  const position = scrub ?? now.positionMs;
  const percent = now.durationMs ? (position / now.durationMs) * 100 : 0;
  const cover = art(track?.album?.images, 640);
  // Only looked up while nothing is playing; null hides the mini player.
  const { data: recent } = useAsync(() => (track ? Promise.resolve(null) : spotify.recentlyPlayed(1)), [!!track]);
  const last = recent?.items[0] ?? null;

  const go = (route: Parameters<Navigate>[0]) => {
    onExpand(false);
    navigate(route);
  };

  const commitSeek = () => {
    if (scrub !== null) player.seek(scrub);
    setScrub(null);
  };

  return (
    <>
      {!track && last && (
        // Nothing playing: offer the last thing you listened to, one tap to resume it.
        <div className='mini mini--last'>
          <span className='mini__open'>
            <span className='mini__art'>{art(last.track.album?.images, 128) && <img src={art(last.track.album?.images, 128)} alt='' />}</span>
            <span className='mini__meta'>
              <span className='mini__label'>{'// last played'}</span>
              <span className='mini__title'>{last.track.name}</span>
            </span>
          </span>
          <button
            className='icon-btn'
            onClick={() => (last.context ? player.playContext(last.context.uri, last.track.uri) : player.playTracks([last.track.uri], 0))}
            aria-label={`Play ${last.track.name}`}
          >
            <Icon name='play' size={22} />
          </button>
        </div>
      )}

      {track && (
      <div className='mini' style={{ '--fill': `${percent}%` } as CSSProperties}>
        {track && (
          <>
            <button className='mini__open' onClick={() => onExpand(true)} aria-label='Open now playing'>
              <span className={`mini__art${now.isPlaying ? ' is-playing' : ''}`}>
                {art(track.album?.images, 128) && <img src={art(track.album?.images, 128)} alt='' />}
              </span>
              <span className='mini__meta'>
                <span className='mini__title'>{track.name}</span>
                <span className='mini__artist'>{track.artists.map((a) => a.name).join(', ')}</span>
              </span>
            </button>
            <button className='icon-btn' onClick={player.toggle} aria-label={now.isPlaying ? 'Pause' : 'Play'}>
              <Icon name={now.isPlaying ? 'pause' : 'play'} size={22} />
            </button>
            <button className='icon-btn' onClick={player.next} aria-label='Next'><Icon name='next' size={20} /></button>
          </>
        )}
      </div>
      )}

      {expanded && track && (
        <div className='nowplaying' role='dialog' aria-label='Now playing'>
          <header className='nowplaying__head'>
            <button className='icon-btn' onClick={() => onExpand(false)} aria-label='Close now playing'>
              <Icon name='forward' size={22} className='nowplaying__down' />
            </button>
            <span className='eyebrow'>{'// now playing'}</span>
            <button className='icon-btn' onClick={() => go({ view: 'queue' })} aria-label='Queue'><Icon name='queue' size={20} /></button>
          </header>

          <button
            className={`nowplaying__art${now.isPlaying ? ' is-playing' : ''}`}
            onClick={() => { const r = refRoute(track.album); if (r) go(r); }}
            aria-label={`Open ${track.album?.name ?? 'album'}`}
          >
            {cover && <img src={cover} alt='' />}
          </button>

          <div className='nowplaying__info'>
            <div className='nowplaying__text'>
              <h2 className='nowplaying__title'>{track.name}</h2>
              <div className='nowplaying__artist'>
                {track.artists.map((a, i) => (
                  <span key={a.uri}>
                    {i > 0 && ', '}
                    <button className='link' onClick={() => { const r = refRoute(a); if (r) go(r); }}>{a.name}</button>
                  </span>
                ))}
              </div>
            </div>
            <button className={`icon-btn like${liked[track.uri] ? ' is-on' : ''}`} onClick={() => toggle(track.uri)} aria-label='Like'>
              <Icon name='heart' size={24} filled={liked[track.uri]} />
            </button>
            <button className='icon-btn' onClick={() => addToPlaylist({ uris: [track.uri] })} aria-label='Add to playlist'>
              <Icon name='plus' size={24} />
            </button>
          </div>

          <div className='nowplaying__seek'>
            <input
              type='range'
              min={0}
              max={now.durationMs || 1}
              value={position}
              onChange={(e) => setScrub(Number(e.target.value))}
              onPointerUp={commitSeek}
              onTouchEnd={commitSeek}
              style={{ '--fill': `${percent}%` } as CSSProperties}
              aria-label='Seek'
            />
            <div className='nowplaying__times'>
              <span>{duration(position)}</span>
              <span>{duration(now.durationMs)}</span>
            </div>
          </div>

          <div className='nowplaying__controls'>
            <button className={`icon-btn${now.shuffle ? ' is-on' : ''}`} onClick={player.toggleShuffle} aria-label='Shuffle' aria-pressed={now.shuffle}>
              <Icon name='shuffle' size={22} />
            </button>
            <button className='icon-btn' onClick={player.previous} aria-label='Previous'><Icon name='prev' size={28} /></button>
            <button className='playbtn playbtn--big' onClick={player.toggle} aria-label={now.isPlaying ? 'Pause' : 'Play'}>
              <Icon name={now.isPlaying ? 'pause' : 'play'} size={30} />
            </button>
            <button className='icon-btn' onClick={player.next} aria-label='Next'><Icon name='next' size={28} /></button>
            <button className={`icon-btn repeat${now.repeat !== 'off' ? ' is-on' : ''}`} onClick={player.cycleRepeat} aria-label={`Repeat: ${now.repeat}`}>
              <Icon name='repeat' size={22} />
              {now.repeat === 'track' && <span className='repeat__one'>1</span>}
            </button>
          </div>

          <footer className='nowplaying__foot'>
            <DeviceMenu />
            <span className='playerbar__device'>{now.device?.name ?? 'no device'}</span>
          </footer>
        </div>
      )}
    </>
  );
}
