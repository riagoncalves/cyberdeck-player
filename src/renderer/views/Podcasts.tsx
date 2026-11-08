import type { Navigate } from '../routes';
import { art, spotify } from '../spotify';
import { useAsync } from '../hooks';
import { CardGrid } from '../components/CardGrid';
import { EpisodeList } from '../components/EpisodeList';
import { Status, ViewHeader } from '../components/ViewHeader';

/** Followed podcasts and saved episodes. */
export function Podcasts({ navigate }: { navigate: Navigate }) {
  const { data, loading, error } = useAsync(async () => {
    const [shows, episodes] = await Promise.all([spotify.savedShows(), spotify.savedEpisodes().catch(() => null)]);
    return { shows: shows.items.map((i) => i.show), episodes: episodes?.items.map((i) => i.episode) ?? [] };
  }, []);

  return (
    <div className='view'>
      <ViewHeader eyebrow='transmissions' title='Podcasts' />
      <Status loading={loading} error={error} />
      {data && (
        <>
          <section className='section'>
            <h2 className='section__title'>Your shows</h2>
            <CardGrid
              items={data.shows.map((s) => ({
                id: s.id,
                title: s.name,
                subtitle: 'Podcast',
                image: art(s.images, 300),
                onOpen: () => navigate({ view: 'show', id: s.id }),
              }))}
            />
          </section>
          {!!data.episodes.length && (
            <section className='section'>
              <h2 className='section__title'>Saved episodes</h2>
              <EpisodeList episodes={data.episodes} navigate={navigate} showShow />
            </section>
          )}
        </>
      )}
    </div>
  );
}
