import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { openRef, type Navigate } from '../routes';
import { art, duration, spotify, type Device } from '../spotify';
import { useLiked } from '../hooks';
import { DEVICE_NAME, usePlayer } from '../player';
import { useAddToPlaylist } from './AddToPlaylist';
import { Icon } from './Icon';

export function DeviceMenu() {
  const player = usePlayer();
  const [open, setOpen] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    spotify.devices().then((d) => setDevices(d.devices)).catch(() => setDevices([]));
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div className='devices' ref={ref}>
      <button className={`icon-btn${open ? ' is-on' : ''}`} onClick={() => setOpen((o) => !o)} aria-label='Devices' aria-expanded={open}>
        <Icon name='devices' />
      </button>
      {open && (
        <div className='devices__menu hud' role='menu'>
          <span className='eyebrow'>{'// output devices'}</span>
          {devices.length === 0 && <p className='devices__empty'>No devices found. Open Spotify on another device, or wait for this app to connect.</p>}
          {devices.map((d) => (
            <button
              key={d.id ?? d.name}
              role='menuitem'
              className={`devices__item${d.is_active ? ' is-active' : ''}`}
              disabled={!d.id}
              onClick={() => {
                if (d.id) player.transfer(d.id);
                setOpen(false);
              }}
            >
              <span>{d.name}{d.name === DEVICE_NAME && ' (this app)'}</span>
              <span className='devices__type'>{d.is_active ? 'active' : d.type.toLowerCase()}</span>
            </button>
          ))}
          <p className='devices__status'>
            In-app audio: {player.sdkStatus === 'ready' ? 'online' : player.sdkStatus === 'loading' ? 'connecting…' : `offline (${player.sdkError ?? 'unknown'})`}
          </p>
        </div>
      )}
    </div>
  );
}

export function PlayerBar({ navigate }: { navigate: Navigate }) {
  const player = usePlayer();
  const { now } = player;
  const track = now.track;
  const { liked, toggle } = useLiked(track && track.id ? [track.uri] : []);
  const addToPlaylist = useAddToPlaylist();
  const [scrub, setScrub] = useState<number | null>(null);
  const position = scrub ?? now.positionMs;
  const percent = now.durationMs ? (position / now.durationMs) * 100 : 0;

  return (
    <footer className='playerbar'>
      <div className='playerbar__now'>
        {track ? (
          <>
            <span className={`playerbar__art${now.isPlaying ? ' is-playing' : ''}`}>
              {art(track.album?.images, 128) && <img src={art(track.album?.images, 128)} alt='' />}
            </span>
            <div className='playerbar__meta'>
              <button className='playerbar__title link' onClick={() => openRef(navigate, track.album)}>
                {track.name}
              </button>
              <div className='playerbar__artist'>
                {track.artists.map((a, i) => (
                  <span key={a.uri}>
                    {i > 0 && ', '}
                    <button className='link' onClick={() => openRef(navigate, a)}>{a.name}</button>
                  </span>
                ))}
              </div>
            </div>
            <button className={`icon-btn like${liked[track.uri] ? ' is-on' : ''}`} onClick={() => toggle(track.uri)} aria-label='Like'>
              <Icon name='heart' filled={liked[track.uri]} />
            </button>
            <button className='icon-btn' onClick={() => addToPlaylist({ uris: [track.uri] })} aria-label='Add to playlist'>
              <Icon name='plus' />
            </button>
          </>
        ) : (
          <span className='playerbar__idle'>{'// idle: pick a track to jack in'}</span>
        )}
      </div>

      <div className='playerbar__center'>
        <div className='playerbar__controls'>
          <button className={`icon-btn${now.shuffle ? ' is-on' : ''}`} onClick={player.toggleShuffle} aria-label='Shuffle' aria-pressed={now.shuffle}>
            <Icon name='shuffle' />
          </button>
          <button className='icon-btn' onClick={player.previous} aria-label='Previous'><Icon name='prev' /></button>
          <button className='playbtn' onClick={player.toggle} aria-label={now.isPlaying ? 'Pause' : 'Play'}>
            <Icon name={now.isPlaying ? 'pause' : 'play'} size={22} />
          </button>
          <button className='icon-btn' onClick={player.next} aria-label='Next'><Icon name='next' /></button>
          <button className={`icon-btn repeat${now.repeat !== 'off' ? ' is-on' : ''}`} onClick={player.cycleRepeat} aria-label={`Repeat: ${now.repeat}`}>
            <Icon name='repeat' />
            {now.repeat === 'track' && <span className='repeat__one'>1</span>}
          </button>
        </div>
        <div className='seek'>
          <span>{duration(position)}</span>
          <input
            type='range'
            min={0}
            max={now.durationMs || 1}
            value={position}
            onChange={(e) => setScrub(Number(e.target.value))}
            onPointerUp={() => {
              if (scrub !== null) player.seek(scrub);
              setScrub(null);
            }}
            onKeyUp={() => {
              if (scrub !== null) player.seek(scrub);
              setScrub(null);
            }}
            style={{ '--fill': `${percent}%` } as CSSProperties}
            aria-label='Seek'
          />
          <span>{duration(now.durationMs)}</span>
        </div>
      </div>

      <div className='playerbar__right'>
        <button className='icon-btn' onClick={() => navigate({ view: 'queue' })} aria-label='Queue'><Icon name='queue' /></button>
        <DeviceMenu />
        <span className='playerbar__device' title={now.device?.name ?? ''}>{now.device?.name ?? 'no device'}</span>
        <div className='volume'>
          <button className='icon-btn' onClick={() => player.setVolume(now.volume > 0 ? 0 : 60)} aria-label='Mute'>
            <Icon name={now.volume > 0 ? 'volume' : 'mute'} />
          </button>
          <input
            type='range'
            min={0}
            max={100}
            value={now.volume}
            onChange={(e) => player.setVolume(Number(e.target.value))}
            style={{ '--fill': `${now.volume}%` } as CSSProperties}
            aria-label='Volume'
          />
        </div>
      </div>
    </footer>
  );
}
