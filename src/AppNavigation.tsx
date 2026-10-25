import type { Page } from './routes.ts';
import { Icon } from './Icon.tsx';

export function AppNavigation({ page, onNavigate }: { page: string; onNavigate: (page: Page) => void }) {
  return <header className={`header ${page === 'discover' || page === 'item' ? 'header-cinematic' : ''}`}>
    <a className="wordmark" href="#/discover" onClick={event => { event.preventDefault(); onNavigate('discover'); }} aria-label="Voidplay home">voidplay<span>.</span></a>
    <nav className="main-nav" aria-label="Store">
      {(['discover', 'browse', 'favorites', 'library'] as const).map(destination => <button key={destination} aria-current={page === destination ? 'page' : undefined} onClick={() => onNavigate(destination)}>{destination.charAt(0).toUpperCase() + destination.slice(1)}</button>)}
    </nav>
    <nav className="utility-nav" aria-label="Tools">
      {(['search', 'downloads', 'settings'] as const).map(destination => <button key={destination} className="icon-button" aria-label={destination.charAt(0).toUpperCase() + destination.slice(1)} title={destination.charAt(0).toUpperCase() + destination.slice(1)} aria-current={page === destination ? 'page' : undefined} onClick={() => onNavigate(destination)}><Icon name={destination === 'downloads' ? 'download' : destination}/></button>)}
    </nav>
  </header>;
}
