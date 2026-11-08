import { useState, type CSSProperties } from 'react';
import { openRef, type Navigate } from '../routes';
import { art, duration, spotify } from '../spotify';
import { useAsync, useLiked } from '../hooks';
import { usePlayer } from '../player';
import { useAddToPlaylist } from './AddToPlaylist';
import { Icon } from './Icon';
import { DeviceMenu } from './PlayerBar';

/** Car layout: an always-visible "now playing" panel with large controls on the right. */
export function CarPanel({ navigate }: { navigate: Navigate }) {
  const player = usePlayer();
  const { now } = player;
  const track = now.track;
  const { liked, toggle } = useLiked(track && track.id ? [track.uri] : []);
  const addToPlaylist = useAddToPlaylist();
  const [scrub, setScrub] = useState<number | null>(null);
  const position = scrub ?? now.positionMs;
  const percent = now.durationMs ? (position / now.durationMs) * 100 : 0;

  // Nothing playing: offer the last thing you listened to.
  const { data: recent } = useAsync(() => (track ? Promise.resolve(null) : spotify.recentlyPlayed(1)), [!!track]);
  const last = recent?.items[0] ?? null;
  const shown = track ?? last?.track ?? null;

  const commitSeek = () => {
    if (scrub !== null) player.seek(scrub);
    setScrub(null);
  };

  const play = () => {
    if (track) return player.toggle();
    if (last) return last.context ? player.playContext(last.context.uri, last.track.uri) : player.playTracks([last.track.uri], 0);
  };

  return (
    <aside className='panel' aria-label='Now playing'>
      <span className='eyebrow'>{track ? '// now playing' : last ? '// last played' : '// idle'}</span>

      <button
        className={`panel__art${now.isPlaying ? ' is-playing' : ''}`}
        onClick={() => shown && openRef(navigate, shown.album)}
        aria-label={shown?.album ? `Open ${shown.album.name}` : 'Cover'}
      >
        {art(shown?.album?.images, 300) && <img src={art(shown?.album?.images, 300)} alt='' />}
      </button>

      <div className='panel__info'>
        <div className='panel__text'>
          <div className='panel__title'>{shown?.name ?? 'Pick a track to jack in'}</div>
          <div className='panel__artist'>
            {shown?.artists.map((a, i) => (
              <span key={a.uri || a.name}>
                {i > 0 && ', '}
                <button className='link' onClick={() => openRef(navigate, a)}>{a.name}</button>
              </span>
            ))}
          </div>
        </div>
        {track && (
          <>
            <button className={`icon-btn like${liked[track.uri] ? ' is-on' : ''}`} onClick={() => toggle(track.uri)} aria-label='Like'>
              <Icon name='heart' size={24} filled={liked[track.uri]} />
            </button>
            <button className='icon-btn' onClick={() => addToPlaylist({ uris: [track.uri] })} aria-label='Add to playlist'>
              <Icon name='plus' size={24} />
            </button>
          </>
        )}
      </div>

      {track && (
        <div className='panel__seek'>
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
          <div className='panel__times'>
            <span>{duration(position)}</span>
            <span>{duration(now.durationMs)}</span>
          </div>
        </div>
      )}

      <div className='panel__controls'>
        <button className={`icon-btn${now.shuffle ? ' is-on' : ''}`} onClick={player.toggleShuffle} aria-label='Shuffle' aria-pressed={now.shuffle}>
          <Icon name='shuffle' size={24} />
        </button>
        <button className='icon-btn' onClick={player.previous} aria-label='Previous'><Icon name='prev' size={30} /></button>
        <button className='playbtn playbtn--big' onClick={play} disabled={!shown} aria-label={now.isPlaying ? 'Pause' : 'Play'}>
          <Icon name={now.isPlaying ? 'pause' : 'play'} size={30} />
        </button>
        <button className='icon-btn' onClick={player.next} aria-label='Next'><Icon name='next' size={30} /></button>
        <button className={`icon-btn repeat${now.repeat !== 'off' ? ' is-on' : ''}`} onClick={player.cycleRepeat} aria-label={`Repeat: ${now.repeat}`}>
          <Icon name='repeat' size={24} />
          {now.repeat === 'track' && <span className='repeat__one'>1</span>}
        </button>
      </div>

      <footer className='panel__foot'>
        <DeviceMenu />
        <span className='playerbar__device'>{now.device?.name ?? 'no device'}</span>
      </footer>
    </aside>
  );
}
