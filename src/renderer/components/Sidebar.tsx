import type { Navigate, Route } from '../routes';
import { art, type User } from '../spotify';
import { usePlaylists } from '../hooks';
import { Icon, type IconName } from './Icon';

const NAV: { route: Route; label: string; icon: IconName }[] = [
  { route: { view: 'home' }, label: 'Home', icon: 'home' },
  { route: { view: 'search' }, label: 'Search', icon: 'search' },
  { route: { view: 'liked' }, label: 'Liked Songs', icon: 'heart' },
  { route: { view: 'albums' }, label: 'Albums', icon: 'album' },
  { route: { view: 'podcasts' }, label: 'Podcasts', icon: 'podcast' },
  { route: { view: 'queue' }, label: 'Queue', icon: 'queue' },
];

interface SidebarProps {
  route: Route;
  navigate: Navigate;
  user: User | null;
  onLogout(): void;
}

export function Sidebar({ route, navigate, user, onLogout }: SidebarProps) {
  const playlists = usePlaylists();

  return (
    <nav className='sidebar' aria-label='Library'>
      <ul className='sidebar__nav'>
        {NAV.map((item) => (
          <li key={item.label}>
            <button
              className={`sidebar__link${route.view === item.route.view ? ' is-active' : ''}`}
              onClick={() => navigate(item.route)}
            >
              <Icon name={item.icon} />
              {item.label}
            </button>
          </li>
        ))}
      </ul>

      <div className='sidebar__section'>
        <span className='eyebrow'>{'// playlists'}</span>
        <span className='sidebar__count'>{playlists.length}</span>
      </div>
      <ul className='sidebar__playlists'>
        {playlists.map((p) => (
          <li key={p.id}>
            <button
              className={`sidebar__playlist${route.view === 'playlist' && route.id === p.id ? ' is-active' : ''}`}
              onClick={() => navigate({ view: 'playlist', id: p.id })}
              title={p.name}
            >
              <span className='sidebar__thumb'>{art(p.images, 64) ? <img src={art(p.images, 64)} alt='' loading='lazy' /> : null}</span>
              <span className='sidebar__label'>{p.name}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className='sidebar__user'>
        {user?.images?.[0] ? <img src={art(user.images, 64)} alt='' /> : <span className='sidebar__avatar'>{user?.display_name?.[0] ?? '?'}</span>}
        <span className='sidebar__name'>{user?.display_name ?? 'Netrunner'}</span>
        <button className='icon-btn' onClick={onLogout} aria-label='Sign out' title='Sign out'><Icon name='logout' size={16} /></button>
      </div>
    </nav>
  );
}
