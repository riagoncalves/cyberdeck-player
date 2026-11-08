import type { Navigate } from '../routes';
import { spotify } from '../spotify';
import { useAsync } from '../hooks';
import { usePlayer } from '../player';
import { TrackList } from '../components/TrackList';
import { Status, ViewHeader } from '../components/ViewHeader';

export function Queue({ navigate }: { navigate: Navigate }) {
  const { now } = usePlayer();
  // Reload whenever the current track changes.
  const { data, loading, error } = useAsync(() => spotify.queue(), [now.track?.uri]);

  return (
    <div className='view'>
      <ViewHeader eyebrow='buffer' title='Queue' />
      <Status loading={loading && !data} error={error} />
      {data && (
        <>
          <section className='section'>
            <h2 className='section__title'>Now playing</h2>
            <TrackList tracks={data.currently_playing ? [data.currently_playing] : []} navigate={navigate} />
          </section>
          <section className='section'>
            <h2 className='section__title'>Next up</h2>
            <TrackList tracks={data.queue} navigate={navigate} />
          </section>
        </>
      )}
    </div>
  );
}
