import { openRef, type Navigate } from '../routes';
import { art, duration, type Playlist, type Track } from '../spotify';
import { useLiked, useMediaQuery } from '../hooks';
import { usePlayer } from '../player';
import { useAddToPlaylist } from './AddToPlaylist';
import { Icon } from './Icon';

interface TrackListProps {
  tracks: Track[];
  navigate: Navigate;
  /** Play inside this context (album, playlist, liked songs); otherwise the list itself is queued. */
  contextUri?: string;
  showAlbum?: boolean;
  showArt?: boolean;
  /** Track number column (albums) instead of a running index. */
  numbered?: boolean;
  /** One of your playlists: the add menu also offers removing songs from it. */
  editablePlaylist?: Playlist;
  onRemoved?(uri: string): void;
}

export function TrackList({
  tracks,
  navigate,
  contextUri,
  showAlbum = true,
  showArt = true,
  numbered = false,
  editablePlaylist,
  onRemoved,
}: TrackListProps) {
  const player = usePlayer();
  const addToPlaylist = useAddToPlaylist();
  const { liked, toggle } = useLiked(tracks.filter((t) => !t.is_local).map((t) => t.uri));
  const current = player.now.track?.uri;
  const coarse = useMediaQuery('(pointer: coarse)');

  const play = (index: number) => {
    const track = tracks[index];
    if (contextUri) player.playContext(contextUri, track.uri);
    else player.playTracks(tracks.map((t) => t.uri), index);
  };

  if (!tracks.length) return <p className='empty'>{'// no signal: nothing here yet'}</p>;

  return (
    <div className={`tracklist${showAlbum ? '' : ' tracklist--no-album'}`} role='table'>
      <div className='tracklist__head' role='row'>
        <span>#</span>
        <span>Title</span>
        {showAlbum && <span>Album</span>}
        <span />
        <span />
        <span className='tracklist__time'>Time</span>
      </div>
      {tracks.map((track, index) => {
        const active = track.uri === current;
        return (
          <div
            key={`${track.uri}-${index}`}
            className={`tracklist__row${active ? ' is-active' : ''}`}
            role='row'
            onDoubleClick={() => play(index)}
            // Touch screens have no double-click: tapping the row plays, unless the tap hit a link or button.
            onClick={(e) => coarse && !(e.target as HTMLElement).closest('button') && play(index)}
          >
            <button className='tracklist__index' onClick={() => play(index)} aria-label={`Play ${track.name}`}>
              <span className='tracklist__num'>
                {active && player.now.isPlaying ? <span className='eq' aria-hidden='true'><i /><i /><i /></span> : numbered ? track.track_number : index + 1}
              </span>
              <Icon name='play' size={14} className='tracklist__play' />
            </button>
            <div className='tracklist__title'>
              {showArt && track.album && <img src={art(track.album.images, 64)} alt='' loading='lazy' />}
              <div>
                <div className='tracklist__name'>
                  {track.explicit && <span className='tag'>E</span>}
                  {track.name}
                </div>
                <div className='tracklist__artists'>
                  {track.artists.map((a, i) => (
                    <span key={a.id || a.name}>
                      {i > 0 && ', '}
                      <button className='link' onClick={() => openRef(navigate, a)}>{a.name}</button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            {showAlbum && (
              <div className='tracklist__album'>
                {track.album && (
                  <button className='link' onClick={() => openRef(navigate, track.album)}>{track.album.name}</button>
                )}
              </div>
            )}
            <button
              className='icon-btn tracklist__add'
              onClick={() =>
                addToPlaylist({
                  uris: [track.uri],
                  removeFrom: editablePlaylist && { playlist: editablePlaylist, onRemoved: () => onRemoved?.(track.uri) },
                })
              }
              aria-label='Add to playlist'
              disabled={track.is_local}
            >
              <Icon name='plus' size={16} />
            </button>
            <button
              className={`icon-btn like${liked[track.uri] ? ' is-on' : ''}`}
              onClick={() => toggle(track.uri)}
              aria-label={liked[track.uri] ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
              disabled={track.is_local}
            >
              <Icon name='heart' size={16} filled={liked[track.uri]} />
            </button>
            <span className='tracklist__time'>{duration(track.duration_ms)}</span>
          </div>
        );
      })}
    </div>
  );
}
