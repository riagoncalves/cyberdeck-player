import type { Navigate } from '../routes';
import { art, spotify, type Track } from '../spotify';
import { useAsync } from '../hooks';
import { usePlayer } from '../player';
import { CardGrid } from '../components/CardGrid';
import { TrackList } from '../components/TrackList';
import { Status, ViewHeader } from '../components/ViewHeader';

const greeting = () => {
  const h = new Date().getHours();
  return h < 5 ? 'Late shift' : h < 12 ? 'Morning run' : h < 18 ? 'Afternoon run' : 'Night city';
};

export function Home({ navigate }: { navigate: Navigate }) {
  const player = usePlayer();
  const { data, loading, error } = useAsync(
    async () => {
      const [recent, top, artists] = await Promise.all([
        spotify.recentlyPlayed().catch(() => ({ items: [] })),
        spotify.topTracks().catch(() => ({ items: [] as Track[] })),
        spotify.topArtists().catch(() => ({ items: [] })),
      ]);
      // Recently played, without repeats.
      const seen = new Set<string>();
      const recentTracks = recent.items.map((i) => i.track).filter((t) => !seen.has(t.uri) && seen.add(t.uri));
      return { recentTracks, top: top.items, artists: artists.items };
    },
    [],
  );

  return (
    <div className='view'>
      <ViewHeader eyebrow='status: online' title={greeting()} />
      <Status loading={loading} error={error} />
      {data && (
        <>
          <section className='section'>
            <h2 className='section__title'>Your top artists</h2>
            <CardGrid
              items={data.artists.map((a) => ({
                id: a.id,
                title: a.name,
                subtitle: 'Artist',
                image: art(a.images, 300),
                round: true,
                onOpen: () => navigate({ view: 'artist', id: a.id }),
                onPlay: () => player.playContext(a.uri),
              }))}
            />
          </section>
          <section className='section'>
            <h2 className='section__title'>On repeat lately</h2>
            <TrackList tracks={data.top} navigate={navigate} />
          </section>
          <section className='section'>
            <h2 className='section__title'>Recently played</h2>
            <TrackList tracks={data.recentTracks} navigate={navigate} />
          </section>
        </>
      )}
    </div>
  );
}
