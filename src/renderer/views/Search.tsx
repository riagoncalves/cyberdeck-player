import { useEffect, useState } from 'react';
import type { Navigate } from '../routes';
import { art, spotify, type Episode, type Show } from '../spotify';
import { useAsync } from '../hooks';
import { usePlayer } from '../player';
import { CardGrid } from '../components/CardGrid';
import { EpisodeList } from '../components/EpisodeList';
import { Icon } from '../components/Icon';
import { TrackList } from '../components/TrackList';
import { Status, ViewHeader } from '../components/ViewHeader';

export function Search({ navigate, initial }: { navigate: Navigate; initial?: string }) {
  const player = usePlayer();
  const [input, setInput] = useState(initial ?? '');
  const [query, setQuery] = useState(initial ?? '');

  // Search as you type, debounced.
  useEffect(() => {
    const id = setTimeout(() => setQuery(input.trim()), 350);
    return () => clearTimeout(id);
  }, [input]);

  const { data, loading, error } = useAsync(() => (query ? spotify.search(query) : Promise.resolve(null)), [query]);

  return (
    <div className='view'>
      <ViewHeader eyebrow='query the net' title='Search' />
      <label className='searchbox'>
        <Icon name='search' />
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='Songs, artists, albums, playlists or podcasts'
          aria-label='Search'
        />
      </label>
      {query && <Status loading={loading} error={error} />}
      {data && (
        <>
          {!!data.tracks?.items.length && (
            <section className='section'>
              <h2 className='section__title'>Songs</h2>
              <TrackList tracks={data.tracks.items} navigate={navigate} />
            </section>
          )}
          {!!data.artists?.items.length && (
            <section className='section'>
              <h2 className='section__title'>Artists</h2>
              <CardGrid
                items={data.artists.items.map((a) => ({
                  id: a.id, title: a.name, subtitle: 'Artist', image: art(a.images, 300), round: true,
                  onOpen: () => navigate({ view: 'artist', id: a.id }),
                  onPlay: () => player.playContext(a.uri),
                }))}
              />
            </section>
          )}
          {!!data.albums?.items.length && (
            <section className='section'>
              <h2 className='section__title'>Albums</h2>
              <CardGrid
                items={data.albums.items.map((a) => ({
                  id: a.id, title: a.name, subtitle: a.artists?.map((x) => x.name).join(', '), image: art(a.images, 300),
                  onOpen: () => navigate({ view: 'album', id: a.id }),
                  onPlay: () => player.playContext(a.uri),
                }))}
              />
            </section>
          )}
          {!!data.playlists?.items.filter(Boolean).length && (
            <section className='section'>
              <h2 className='section__title'>Playlists</h2>
              <CardGrid
                items={data.playlists.items.filter((p) => p !== null).map((p) => ({
                  id: p.id, title: p.name, subtitle: p.owner.display_name, image: art(p.images, 300),
                  onOpen: () => navigate({ view: 'playlist', id: p.id }),
                  onPlay: () => player.playContext(p.uri),
                }))}
              />
            </section>
          )}
          {!!data.shows?.items.filter(Boolean).length && (
            <section className='section'>
              <h2 className='section__title'>Podcasts</h2>
              <CardGrid
                items={data.shows.items.filter((s): s is Show => s !== null).map((s) => ({
                  id: s.id, title: s.name, subtitle: 'Podcast', image: art(s.images, 300),
                  onOpen: () => navigate({ view: 'show', id: s.id }),
                }))}
              />
            </section>
          )}
          {!!data.episodes?.items.filter(Boolean).length && (
            <section className='section'>
              <h2 className='section__title'>Episodes</h2>
              <EpisodeList episodes={data.episodes.items.filter((e): e is Episode => e !== null)} navigate={navigate} />
            </section>
          )}
        </>
      )}
      {!query && <p className='empty'>{'// type to scan the catalogue'}</p>}
    </div>
  );
}
