import { useCallback, useEffect, useState } from 'react';
import type { Navigate } from '../routes';
import { art, spotify, type Episode } from '../spotify';
import { useAsync } from '../hooks';
import { usePlayer } from '../player';
import { EpisodeList } from '../components/EpisodeList';
import { Status, ViewHeader } from '../components/ViewHeader';

const plainText = (html: string) => new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '';

export function ShowView({ id, navigate }: { id: string; navigate: Navigate }) {
  const player = usePlayer();
  const { data: show, loading, error } = useAsync(() => spotify.show(id), [id]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [next, setNext] = useState<number | null>(0);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (offset: number) => {
      setBusy(true);
      try {
        const page = await spotify.showEpisodes(id, offset);
        const items = page.items.filter((e): e is Episode => !!e);
        setEpisodes((list) => (offset === 0 ? items : [...list, ...items]));
        setNext(page.next ? offset + page.limit : null);
      } finally {
        setBusy(false);
      }
    },
    [id],
  );

  useEffect(() => {
    load(0).catch(() => setNext(null));
  }, [load]);

  return (
    <div className='view'>
      <Status loading={loading} error={error} />
      {show && (
        <>
          <ViewHeader
            eyebrow='podcast'
            title={show.name}
            image={art(show.images, 300) ?? ''}
            meta={show.total_episodes ? <span>{show.total_episodes} episodes</span> : undefined}
            // Newest episode first.
            onPlay={episodes.length ? () => player.playTracks(episodes.map((e) => e.uri), 0) : undefined}
          />
          {show.description && <p className='viewdesc viewdesc--clamp'>{plainText(show.description)}</p>}
          <EpisodeList episodes={episodes.map((e) => ({ ...e, show }))} navigate={navigate} />
          {next !== null && !busy && (
            <button className='btn-ghost more' onClick={() => load(next)}>Load more</button>
          )}
        </>
      )}
    </div>
  );
}
