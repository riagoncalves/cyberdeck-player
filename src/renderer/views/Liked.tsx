import { useCallback, useEffect, useState } from 'react';
import type { Navigate } from '../routes';
import { spotify, type Track, type User } from '../spotify';
import { usePlayer } from '../player';
import { TrackList } from '../components/TrackList';
import { Status, ViewHeader } from '../components/ViewHeader';

export function Liked({ navigate, user }: { navigate: Navigate; user: User | null }) {
  const player = usePlayer();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [total, setTotal] = useState(0);
  const [next, setNext] = useState<number | null>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (offset: number) => {
    setLoading(true);
    try {
      const page = await spotify.likedTracks(offset);
      setTracks((t) => (offset === 0 ? [] : t).concat(page.items.map((i) => i.track)));
      setTotal(page.total);
      setNext(page.next ? offset + page.limit : null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(0);
  }, [load]);

  // Liked Songs plays as its own context, so the queue continues through the whole library.
  const contextUri = user ? `spotify:user:${user.id}:collection` : undefined;

  return (
    <div className='view'>
      <ViewHeader
        eyebrow='saved signal'
        title='Liked Songs'
        image=''
        meta={<span>{total} songs</span>}
        onPlay={contextUri ? () => player.playContext(contextUri) : undefined}
      />
      <TrackList tracks={tracks} navigate={navigate} contextUri={contextUri} />
      <Status loading={loading} error={error} />
      {next !== null && !loading && (
        <button className='btn-ghost more' onClick={() => load(next)}>Load more</button>
      )}
    </div>
  );
}
