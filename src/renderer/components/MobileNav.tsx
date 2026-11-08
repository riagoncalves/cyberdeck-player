import type { Navigate, Route } from '../routes';
import { Icon, type IconName } from './Icon';

const TABS: { route: Route; label: string; icon: IconName; views: Route['view'][] }[] = [
  { route: { view: 'home' }, label: 'Home', icon: 'home', views: ['home'] },
  { route: { view: 'search' }, label: 'Search', icon: 'search', views: ['search'] },
  { route: { view: 'liked' }, label: 'Liked', icon: 'heart', views: ['liked'] },
  { route: { view: 'library' }, label: 'Library', icon: 'library', views: ['library', 'albums', 'playlist', 'podcasts', 'show'] },
];

/** Bottom tabs in the phone layout. */
export function MobileNav({ route, navigate }: { route: Route; navigate: Navigate }) {
  return (
    <nav className='tabbar' aria-label='Main'>
      {TABS.map((tab) => {
        const active = tab.views.includes(route.view);
        return (
          <button
            key={tab.label}
            className={`tabbar__tab${active ? ' is-active' : ''}`}
            onClick={() => navigate(tab.route)}
            aria-current={active ? 'page' : undefined}
          >
            <Icon name={tab.icon} size={22} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
