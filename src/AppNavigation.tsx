import { useEffect, useState } from 'react';
import type { Page } from './routes.ts';
import { Icon } from './Icon.tsx';

export function AppNavigation({ page, onNavigate, transferCount }: { page: string; onNavigate: (page: Page) => void; transferCount: number }) {
  const [scrolled, setScrolled] = useState(() => window.scrollY > 24);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  return <header className={`header${scrolled ? ' header-scrolled' : ''}`}>
    <div className="brand-lockup"><a className="wordmark" href="#/discover" onClick={event => { event.preventDefault(); onNavigate('discover'); }} aria-label="Voidplay home">voidplay.</a><span className="beta-badge">BETA</span></div>
    <nav className="main-nav" aria-label="Store">
      {(['discover', 'browse', 'downloads', 'library'] as const).map(destination => <button key={destination} aria-current={page === destination ? 'page' : undefined} onClick={() => onNavigate(destination)}>{destination.charAt(0).toUpperCase() + destination.slice(1)}{destination === 'downloads' && transferCount > 0 ? <span className="nav-count" aria-hidden="true">{transferCount}</span> : null}</button>)}
    </nav>
    <nav className="utility-nav" aria-label="Tools">
      <button className={`icon-button favorites-link ${page === 'favorites' ? 'is-favorite' : ''}`} aria-label="Favorites" title="Favorites" aria-current={page === 'favorites' ? 'page' : undefined} onClick={() => onNavigate('favorites')}><Icon name="heart"/></button>
      {(['search', 'settings'] as const).map(destination => <button key={destination} className="icon-button" aria-label={destination.charAt(0).toUpperCase() + destination.slice(1)} title={destination.charAt(0).toUpperCase() + destination.slice(1)} aria-current={page === destination ? 'page' : undefined} onClick={() => onNavigate(destination)}><Icon name={destination}/></button>)}
    </nav>
  </header>;
}
