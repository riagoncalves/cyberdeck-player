import type { Navigate } from '../routes';
import { art, type User } from '../spotify';
import { usePlaylists } from '../hooks';
import { Icon } from '../components/Icon';
import { ViewHeader } from '../components/ViewHeader';

interface LibraryProps {
  navigate: Navigate;
  user: User | null;
  onLogout(): void;
}

/** Phone layout: what the desktop sidebar holds (playlists, albums, account). */
export function Library({ navigate, user, onLogout }: LibraryProps) {
  const playlists = usePlaylists();

  return (
    <div className='view'>
      <ViewHeader eyebrow='library' title='Your library' />

      <div className='library__links'>
        <button className='library__link hud' onClick={() => navigate({ view: 'albums' })}>
          <Icon name='album' size={22} /> Albums & artists
        </button>
        <button className='library__link hud' onClick={() => navigate({ view: 'podcasts' })}>
          <Icon name='podcast' size={22} /> Podcasts
        </button>
        <button className='library__link hud' onClick={() => navigate({ view: 'queue' })}>
          <Icon name='queue' size={22} /> Queue
        </button>
      </div>

      <section className='section'>
        <h2 className='section__title'>Playlists <span className='sidebar__count'>{playlists.length}</span></h2>
        <ul className='library__list'>
          {playlists.map((p) => (
            <li key={p.id}>
              <button className='sidebar__playlist' onClick={() => navigate({ view: 'playlist', id: p.id })}>
                <span className='sidebar__thumb'>{art(p.images, 64) ? <img src={art(p.images, 64)} alt='' loading='lazy' /> : null}</span>
                <span className='sidebar__label'>{p.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className='sidebar__user library__user'>
        {user?.images?.[0] ? <img src={art(user.images, 64)} alt='' /> : <span className='sidebar__avatar'>{user?.display_name?.[0] ?? '?'}</span>}
        <span className='sidebar__name'>{user?.display_name ?? 'Netrunner'}</span>
        <button className='btn-ghost' onClick={onLogout}>Sign out</button>
      </div>
    </div>
  );
}
