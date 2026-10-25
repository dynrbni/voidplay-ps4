export function AppNavigation({ page, onNavigate, onSearch }: {
  page: 'home' | 'browse'; onNavigate: (page: 'home' | 'browse') => void; onSearch: () => void;
}) {
  return <header className="header">
    <a className="wordmark" href="#" onClick={event => { event.preventDefault(); onNavigate('home'); }} aria-label="Voidplay home">void<span>play</span><i aria-hidden="true">.</i></a>
    <nav aria-label="Store"><button aria-current={page === 'home' ? 'page' : undefined} onClick={() => onNavigate('home')}>Discover</button>
      <button aria-current={page === 'browse' ? 'page' : undefined} onClick={() => onNavigate('browse')}>Browse</button>
      <button onClick={onSearch}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>Search</button></nav>
    <span className="preview-label">Local preview <span aria-hidden="true">/</span> Mock catalog</span>
  </header>;
}
