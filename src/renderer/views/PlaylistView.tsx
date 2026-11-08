import { useEffect, useState } from 'react';
import type { Navigate } from '../routes';
import { art, embedPlaylistTracks, spotify, type Track } from '../spotify';
import { useAsync, useMe } from '../hooks';
import { usePlayer } from '../player';
import { TrackList } from '../components/TrackList';
import { Status, ViewHeader } from '../components/ViewHeader';

/** Playlist descriptions arrive HTML-escaped and may contain links: show them as text only. */
const plainText = (html: string) => new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '';

/** Where the song list came from: the Web API, the public embed (playlists you don't own), or nowhere. */
type Source = 'api' | 'embed' | 'none';

export function PlaylistView({ id, navigate }: { id: string; navigate: Navigate }) {
  const player = usePlayer();
  const { data: playlist, loading, error } = useAsync(() => spotify.playlist(id), [id]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [source, setSource] = useState<Source>('api');
  const me = useMe();
  const editable = !!playlist && !!me && (playlist.owner.id === me.id || !!playlist.collaborative);

  // Spotify only returns the songs of playlists you own or collaborate on. For the rest,
  // fall back to the playlist's public embed.
  useEffect(() => {
    let alive = true;
    setTracks([]);
    setSource('api');
    (async () => {
      const all: Track[] = [];
      for (let offset = 0; offset < 2000; offset += 50) {
        const page = await spotify.playlistItems(id, offset);
        all.push(...page.items.map((i) => i.item).filter((t): t is Track => !!t && 'duration_ms' in t));
        if (alive) setTracks([...all]);
        if (!page.next) break;
      }
    })().catch(async () => {
      try {
        const list = await embedPlaylistTracks(id);
        if (alive) {
          setTracks(list);
          setSource('embed');
        }
      } catch {
        if (alive) setSource('none');
      }
    });
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <div className='view'>
      <Status loading={loading} error={error} />
      {playlist && (
        <>
          <ViewHeader
            eyebrow='playlist'
            title={playlist.name}
            image={art(playlist.images, 300) ?? ''}
            meta={
              <>
                <span>{playlist.owner.display_name}</span>
                {source !== 'none' && <span>{tracks.length}{source === 'embed' && tracks.length >= 100 ? '+' : ''} songs</span>}
              </>
            }
            onPlay={() => player.playContext(playlist.uri)}
          />
          {playlist.description && <p className='viewdesc'>{plainText(playlist.description)}</p>}
          {source === 'none' ? (
            <p className='notice hud'>
              {"// Spotify doesn't let third-party apps list the songs in playlists you don't own, and this one has no public embed. You can still play it with the button above."}
            </p>
          ) : (
            <>
              {source === 'embed' && (
                <p className='notice notice--slim'>
                  {"// Not your playlist: songs read from Spotify's public embed (first 100 only)."}
                </p>
              )}
              <TrackList
                tracks={tracks}
                navigate={navigate}
                contextUri={playlist.uri}
                showAlbum={source === 'api'}
                showArt={source === 'api'}
                editablePlaylist={editable ? playlist : undefined}
                onRemoved={(uri) => setTracks((list) => list.filter((t) => t.uri !== uri))}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
