import { Icon } from './Icon';

interface TitleBarProps {
  canBack: boolean;
  canForward: boolean;
  onBack(): void;
  onForward(): void;
}

export function TitleBar({ canBack, canForward, onBack, onForward }: TitleBarProps) {
  const desktop = window.deck.platform === 'desktop';
  return (
    <header className='titlebar'>
      <div className='titlebar__nav'>
        <button className='icon-btn' onClick={onBack} disabled={!canBack} aria-label='Back'><Icon name='back' /></button>
        <button className='icon-btn titlebar__forward' onClick={onForward} disabled={!canForward} aria-label='Forward'><Icon name='forward' /></button>
      </div>
      <div className='titlebar__brand' aria-hidden='true'>
        <span className='glitch' data-text='CYBERDECK'>CYBERDECK</span>
        <span className='titlebar__sub'>{'// player'}</span>
      </div>
      <div className='titlebar__controls'>
        {desktop && (
          <>
            <button className='icon-btn' onClick={() => window.deck.window.minimize()} aria-label='Minimize'><Icon name='minimize' size={16} /></button>
            <button className='icon-btn' onClick={() => window.deck.window.toggleMaximize()} aria-label='Maximize'><Icon name='maximize' size={14} /></button>
            <button className='icon-btn is-danger' onClick={() => window.deck.window.close()} aria-label='Close'><Icon name='close' size={16} /></button>
          </>
        )}
      </div>
    </header>
  );
}
