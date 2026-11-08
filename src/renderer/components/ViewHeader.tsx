import type { ReactNode } from 'react';
import { Icon } from './Icon';

interface ViewHeaderProps {
  eyebrow: string;
  title: string;
  image?: string;
  round?: boolean;
  meta?: ReactNode;
  onPlay?(): void;
}

export function ViewHeader({ eyebrow, title, image, round, meta, onPlay }: ViewHeaderProps) {
  return (
    <header className='viewhead'>
      {image !== undefined && (
        <span className={`viewhead__art${round ? ' is-round' : ''}`}>{image ? <img src={image} alt='' /> : null}</span>
      )}
      <div className='viewhead__text'>
        <span className='eyebrow'>{`// ${eyebrow}`}</span>
        <h1 className='viewhead__title'>{title}</h1>
        {meta && <div className='viewhead__meta'>{meta}</div>}
      </div>
      {onPlay && (
        <button className='playbtn playbtn--big' onClick={onPlay} aria-label={`Play ${title}`}>
          <Icon name='play' size={26} />
        </button>
      )}
    </header>
  );
}

export function Status({ loading, error }: { loading: boolean; error: string | null }) {
  if (error) return <p className='status status--error' role='alert'>{`// error: ${error}`}</p>;
  if (loading) return <p className='status'><span className='blink'>▮</span> decrypting…</p>;
  return null;
}
