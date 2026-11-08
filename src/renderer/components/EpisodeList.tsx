import { useMediaQuery } from '../hooks';
import { usePlayer } from '../player';
import type { Navigate } from '../routes';
import { art, duration, type Episode } from '../spotify';
import { Icon } from './Icon';

interface EpisodeListProps {
  episodes: Episode[];
  navigate: Navigate;
  /** Show each episode's podcast name (lists that mix shows). */
  showShow?: boolean;
}

/** Descriptions can carry HTML entities; render them as plain text. */
const plainText = (html: string) => new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '';

export function EpisodeList({ episodes, navigate, showShow = false }: EpisodeListProps) {
  const player = usePlayer();
  const coarse = useMediaQuery('(pointer: coarse)');
  const current = player.now.track?.uri;

  // Episodes queue one after another, starting at the one picked.
  const play = (index: number) => player.playTracks(episodes.map((e) => e.uri), index);

  if (!episodes.length) return <p className='empty'>{'// no signal: nothing here yet'}</p>;

  return (
    <ul className='episodes'>
      {episodes.map((e, index) => {
        const active = e.uri === current;
        const resume = e.resume_point;
        const progress = resume && !resume.fully_played && resume.resume_position_ms > 0 ? (resume.resume_position_ms / e.duration_ms) * 100 : 0;
        return (
          <li
            key={e.id}
            className={`episode${active ? ' is-active' : ''}`}
            onDoubleClick={() => play(index)}
            onClick={(ev) => coarse && !(ev.target as HTMLElement).closest('button') && play(index)}
          >
            {art(e.images, 64) && <img className='episode__art' src={art(e.images, 64)} alt='' loading='lazy' />}
            <div className='episode__body'>
              {showShow && e.show && (
                <button className='link episode__show' onClick={() => navigate({ view: 'show', id: e.show!.id })}>{e.show.name}</button>
              )}
              <div className='episode__name'>
                {e.explicit && <span className='tag'>E</span>}
                {e.name}
              </div>
              {e.description && <p className='episode__desc'>{plainText(e.description)}</p>}
              <div className='episode__meta'>
                <span>{e.release_date}</span>
                <span>{duration(e.duration_ms)}</span>
                {resume?.fully_played && <span className='episode__done'>played</span>}
              </div>
              {progress > 0 && <span className='episode__progress' style={{ width: `${progress}%` }} />}
            </div>
            <button className='playbtn' onClick={() => play(index)} aria-label={`Play ${e.name}`}>
              <Icon name={active && player.now.isPlaying ? 'pause' : 'play'} size={18} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
