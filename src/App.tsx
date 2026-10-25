import { useEffect, useRef, useState } from 'react';
import { filterCatalog, loadCatalog } from './catalog.ts';
import type { CatalogEntry } from './catalog.ts';
import { Details } from './Details.tsx';
import { installKeyboardNavigation } from './navigation.ts';

type CatalogState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; entries: CatalogEntry[] };

function AppCard({ entry, onSelect }: { entry: CatalogEntry; onSelect: (entry: CatalogEntry) => void }) {
  return (
    <li><button className="app-card" onClick={() => onSelect(entry)} aria-label={`View ${entry.title} (mock)`}>
      <span className="cover"><span>{entry.title}</span><small>Artwork placeholder</small></span>
      <span className="card-info"><span className="category">{entry.category} · Mock</span><strong>{entry.title}</strong></span>
    </button></li>
  );
}

export function App() {
  const [page, setPage] = useState<'home' | 'browse'>('home');
  const [catalog, setCatalog] = useState<CatalogState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState<CatalogEntry | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(installKeyboardNavigation, []);
  useEffect(() => {
    const controller = new AbortController();
    loadCatalog(controller.signal).then(
      entries => { if (!controller.signal.aborted) setCatalog({ status: 'ready', entries }); },
      () => { if (!controller.signal.aborted) setCatalog({ status: 'error' }); }
    );
    return () => controller.abort();
  }, [attempt]);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);

  function navigate(next: 'home' | 'browse') {
    setPage(next);
    requestAnimationFrame(() => heading.current?.focus());
  }
  function retry() {
    setCatalog({ status: 'loading' });
    setAttempt(value => value + 1);
  }
  function clearFilters() { setQuery(''); setCategory('All'); }

  const entries = catalog.status === 'ready' ? catalog.entries : [];
  const featured = entries[0];
  const visible = page === 'browse' ? filterCatalog(entries, query, category) : entries;

  return (
    <div className="shell">
      <a className="skip-link" href="#content">Skip to catalog</a>
      <header className="header">
        <a className="wordmark" href="#" onClick={event => { event.preventDefault(); navigate('home'); }} aria-label="Voidplay home">void<span>play</span><i aria-hidden="true">.</i></a>
        <nav aria-label="Store"><button aria-current={page === 'home' ? 'page' : undefined} onClick={() => navigate('home')}>Home</button>
          <button aria-current={page === 'browse' ? 'page' : undefined} onClick={() => navigate('browse')}>Browse</button></nav>
        <span className="preview-label">Desktop preview</span>
      </header>
      {!online && <p className="offline" role="status">You’re offline. Loaded mock entries remain available; retry loading after reconnecting.</p>}
      <main id="content" tabIndex={-1}>
        <div className="page-heading"><div><p className="eyebrow">Homebrew library</p>
          <h1 ref={heading} tabIndex={-1}>{page === 'home' ? 'Make room for homebrew.' : 'Find your next project.'}</h1></div>
          <p className="source-note">Local mock catalog<br />PS4 runtime unverified</p></div>
        {catalog.status === 'loading' ? <section className="message" role="status"><h2>Loading local catalog…</h2><p>Reading the preview fixture.</p></section>
          : catalog.status === 'error' ? <section className="message" role="alert"><h2>Catalog unavailable</h2><p>The local catalog could not be loaded or its metadata is invalid.</p><button onClick={retry}>Retry catalog</button></section>
          : entries.length === 0 ? <section className="message"><h2>No applications yet</h2><p>The catalog is empty. Reload after entries have been added.</p><button onClick={retry}>Reload catalog</button></section>
          : <>
            {page === 'home' && featured && <section className="featured" aria-labelledby="featured-title">
              <div className="featured-copy"><p className="eyebrow">Featured fixture · {featured.category}</p><h2 id="featured-title">{featured.title}</h2>
                <p>{featured.description}</p><button className="primary" onClick={() => setSelected(featured)}>View application</button></div>
              <div className="featured-art" aria-hidden="true"><span>{featured.title}</span><small>Mock cover / artwork placeholder</small></div>
            </section>}
            {page === 'browse' && <form className="filters" role="search" onSubmit={event => event.preventDefault()}>
              <label>Search applications<input type="search" value={query} placeholder="Title, description, or category" onChange={event => setQuery(event.target.value)} /></label>
              <label>Category<select value={category} onChange={event => setCategory(event.target.value)}><option>All</option><option>Utilities</option><option>Games</option><option>Media</option></select></label>
              <button type="button" onClick={clearFilters}>Clear filters</button>
            </form>}
            <section aria-labelledby="shelf-title"><div className="shelf-heading"><h2 id="shelf-title">{page === 'home' ? 'In the preview library' : 'Catalog'}</h2>
              {page === 'home' ? <button className="text-button" onClick={() => navigate('browse')}>Browse all applications</button> : <p role="status">{visible.length} {visible.length === 1 ? 'application' : 'applications'}</p>}</div>
              {visible.length > 0 ? <ul className="app-grid">{visible.map(entry => <AppCard key={entry.id} entry={entry} onSelect={setSelected} />)}</ul>
                : <div className="message"><h3>No matching applications</h3><p>Try another search or clear your category selection.</p><button onClick={clearFilters}>Clear filters</button></div>}
            </section>
          </>}
      </main>
      <footer><p><strong>Preview, not a console release.</strong> All listings are fictional mock data. No downloads or installation.</p>
        <p>Keyboard: Tab to move · Arrow keys between controls · Enter to open · Esc to close details</p></footer>
      {selected && <Details entry={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
