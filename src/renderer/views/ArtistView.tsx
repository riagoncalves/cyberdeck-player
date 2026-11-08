import type { Navigate } from '../routes';
import { art, spotify } from '../spotify';
import { useAsync } from '../hooks';
import { usePlayer } from '../player';
import { CardGrid } from '../components/CardGrid';
import { Status, ViewHeader } from '../components/ViewHeader';

export function ArtistView({ id, navigate }: { id: string; navigate: Navigate }) {
  const player = usePlayer();
  const { data, loading, error } = useAsync(async () => {
    const [artist, albums] = await Promise.all([spotify.artist(id), spotify.artistAlbums(id)]);
    return { artist, albums };
  }, [id]);

  return (
    <div className='view'>
      <Status loading={loading} error={error} />
      {data && (
        <>
          <ViewHeader
            eyebrow='artist'
            title={data.artist.name}
            image={art(data.artist.images, 300) ?? ''}
            round
            meta={data.artist.genres?.length ? <span>{data.artist.genres.slice(0, 3).join(' / ')}</span> : undefined}
            onPlay={() => player.playContext(data.artist.uri)}
          />
          <section className='section'>
            <h2 className='section__title'>Discography</h2>
            <CardGrid
              items={data.albums.map((a) => ({
                id: a.id,
                title: a.name,
                subtitle: `${a.release_date?.slice(0, 4) ?? ''} · ${a.album_type ?? 'album'}`,
                image: art(a.images, 300),
                onOpen: () => navigate({ view: 'album', id: a.id }),
                onPlay: () => player.playContext(a.uri),
              }))}
            />
          </section>
        </>
      )}
    </div>
  );
}
