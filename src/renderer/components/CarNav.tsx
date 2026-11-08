import type { Navigate, Route } from '../routes';
import { Icon, type IconName } from './Icon';

const ITEMS: { route: Route; label: string; icon: IconName; views: Route['view'][] }[] = [
  { route: { view: 'home' }, label: 'Home', icon: 'home', views: ['home'] },
  { route: { view: 'search' }, label: 'Search', icon: 'search', views: ['search'] },
  { route: { view: 'liked' }, label: 'Liked', icon: 'heart', views: ['liked'] },
  { route: { view: 'library' }, label: 'Library', icon: 'library', views: ['library', 'albums', 'playlist'] },
  { route: { view: 'podcasts' }, label: 'Podcasts', icon: 'podcast', views: ['podcasts', 'show'] },
  { route: { view: 'queue' }, label: 'Queue', icon: 'queue', views: ['queue'] },
];

interface CarNavProps {
  route: Route;
  navigate: Navigate;
  canBack: boolean;
  onBack(): void;
}

/** Car layout: a rail of large touch targets down the left edge. */
export function CarNav({ route, navigate, canBack, onBack }: CarNavProps) {
  return (
    <nav className='rail' aria-label='Main'>
      <button className='rail__item rail__back' onClick={onBack} disabled={!canBack} aria-label='Back'>
        <Icon name='back' size={26} />
      </button>
      {ITEMS.map((item) => {
        const active = item.views.includes(route.view);
        return (
          <button
            key={item.label}
            className={`rail__item${active ? ' is-active' : ''}`}
            onClick={() => navigate(item.route)}
            aria-current={active ? 'page' : undefined}
          >
            <Icon name={item.icon} size={24} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
