import { useState } from 'react';

/** First run: sign in with Spotify. The Client ID is compiled in from .env. */
export function Setup({ onDone, reauth = false }: { onDone(): void; reauth?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async () => {
    setBusy(true);
    setError(null);
    try {
      await window.deck.login();
      onDone();
    } catch (err) {
      setError((err as Error).message.replace(/^Error invoking remote method '[^']+': (Error: )?/, ''));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className='setup'>
      <div className='setup__panel hud'>
        <span className='eyebrow'>{'// boot sequence'}</span>
        <h1 className='glitch setup__title' data-text='CYBERDECK PLAYER'>CYBERDECK PLAYER</h1>
        <p className='setup__lead'>
          {reauth
            ? 'The deck needs a new Spotify permission (editing your playlists). Connect once more to grant it.'
            : 'Sign in with Spotify in your browser, then come back here. You need Premium to play music.'}
        </p>
        <div className='setup__actions'>
          <button className='btn-neon' onClick={login} disabled={busy}>{busy ? 'Waiting for browser…' : 'Connect Spotify'}</button>
        </div>
        {error && <p className='setup__error' role='alert'>{error}</p>}
      </div>
    </div>
  );
}
