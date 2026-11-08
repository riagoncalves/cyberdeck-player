import type { Navigate } from '../routes';
import { art, duration, spotify, type Track } from '../spotify';
import { useAsync } from '../hooks';
import { usePlayer } from '../player';
import { TrackList } from '../components/TrackList';
import { Status, ViewHeader } from '../components/ViewHeader';

export function AlbumView({ id, navigate }: { id: string; navigate: Navigate }) {
  const player = usePlayer();
  const { data, loading, error } = useAsync(async () => {
    const album = await spotify.album(id);
    const tracks: Track[] = [...album.tracks.items];
    let offset = tracks.length;
    while (offset < album.tracks.total) {
      const page = await spotify.albumTracks(id, offset);
      tracks.push(...page.items);
      offset += page.items.length || album.tracks.total;
    }
    // Album track objects have no album field; add it back for the art column.
    return { album, tracks: tracks.map((t) => ({ ...t, album: { id: album.id, name: album.name, uri: album.uri, images: album.images } })) };
  }, [id]);

  const total = data?.tracks.reduce((sum, t) => sum + t.duration_ms, 0) ?? 0;

  return (
    <div className='view'>
      <Status loading={loading} error={error} />
      {data && (
        <>
          <ViewHeader
            eyebrow={data.album.album_type ?? 'album'}
            title={data.album.name}
            image={art(data.album.images, 300) ?? ''}
            meta={
              <>
                {data.album.artists.map((a) => (
                  <button key={a.id} className='link' onClick={() => navigate({ view: 'artist', id: a.id })}>{a.name}</button>
                ))}
                <span>{data.album.release_date?.slice(0, 4)}</span>
                <span>{data.tracks.length} songs, {duration(total)}</span>
              </>
            }
            onPlay={() => player.playContext(data.album.uri)}
          />
          <TrackList tracks={data.tracks} navigate={navigate} contextUri={data.album.uri} showAlbum={false} showArt={false} numbered />
        </>
      )}
    </div>
  );
}
