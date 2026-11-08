import { Icon } from './Icon';

export interface CardItem {
  id: string;
  title: string;
  subtitle?: string;
  image?: string;
  round?: boolean;
  onOpen(): void;
  onPlay?(): void;
}

export function CardGrid({ items }: { items: CardItem[] }) {
  if (!items.length) return <p className='empty'>{'// no signal: nothing here yet'}</p>;
  return (
    <div className='cards'>
      {items.map((item) => (
        <div key={item.id} className='card'>
          <button className='card__open' onClick={item.onOpen}>
            <span className={`card__art${item.round ? ' is-round' : ''}`}>
              {item.image ? <img src={item.image} alt='' loading='lazy' /> : <span className='card__placeholder'>{item.title.slice(0, 2)}</span>}
            </span>
            <span className='card__title'>{item.title}</span>
            {item.subtitle && <span className='card__subtitle'>{item.subtitle}</span>}
          </button>
          {item.onPlay && (
            <button className='card__play' onClick={item.onPlay} aria-label={`Play ${item.title}`}>
              <Icon name='play' size={18} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
