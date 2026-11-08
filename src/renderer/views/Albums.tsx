import type { Navigate } from '../routes';
import { art, spotify } from '../spotify';
import { useAsync } from '../hooks';
import { usePlayer } from '../player';
import { CardGrid } from '../components/CardGrid';
import { Status, ViewHeader } from '../components/ViewHeader';

export function Albums({ navigate }: { navigate: Navigate }) {
  const player = usePlayer();
  const { data, loading, error } = useAsync(async () => {
    const [albums, artists] = await Promise.all([spotify.savedAlbums(), spotify.followedArtists().catch(() => null)]);
    return { albums: albums.items.map((i) => i.album), artists: artists?.artists.items ?? [] };
  }, []);

  return (
    <div className='view'>
      <ViewHeader eyebrow='archive' title='Albums & artists' />
      <Status loading={loading} error={error} />
      {data && (
        <>
          <section className='section'>
            <h2 className='section__title'>Saved albums</h2>
            <CardGrid
              items={data.albums.map((a) => ({
                id: a.id, title: a.name, subtitle: a.artists?.map((x) => x.name).join(', '), image: art(a.images, 300),
                onOpen: () => navigate({ view: 'album', id: a.id }),
                onPlay: () => player.playContext(a.uri),
              }))}
            />
          </section>
          <section className='section'>
            <h2 className='section__title'>Followed artists</h2>
            <CardGrid
              items={data.artists.map((a) => ({
                id: a.id, title: a.name, subtitle: 'Artist', image: art(a.images, 300), round: true,
                onOpen: () => navigate({ view: 'artist', id: a.id }),
                onPlay: () => player.playContext(a.uri),
              }))}
            />
          </section>
        </>
      )}
    </div>
  );
}
