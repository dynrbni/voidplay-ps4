import { useEffect, useRef, useState } from 'react';
import { filterCatalog, loadCatalog, sortCatalog } from './catalog.ts';
import type { CatalogEntry } from './catalog.ts';
import { Details } from './Details.tsx';
import { installKeyboardNavigation } from './navigation.ts';
import { AppNavigation } from './AppNavigation.tsx';
import { FeaturedHero } from './FeaturedHero.tsx';
import { ContentShelf } from './ContentShelf.tsx';
import { ContentPoster } from './ContentPoster.tsx';

type CatalogState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; entries: CatalogEntry[] };

export function App() {
  const [page, setPage] = useState<'home' | 'browse'>('home');
  const [catalog, setCatalog] = useState<CatalogState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('curated');
  const [selected, setSelected] = useState<CatalogEntry | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const heading = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const discover = useRef({ scroll: 0, trigger: null as HTMLElement | null });

  useEffect(installKeyboardNavigation, []);
  useEffect(() => {
    function back(event: KeyboardEvent) {
      if (event.key === 'Escape' && page === 'browse' && !document.querySelector('dialog[open]')) {
        event.preventDefault();
        setPage('home');
        requestAnimationFrame(() => {
          discover.current.trigger?.focus({ preventScroll: true });
          window.scrollTo(0, discover.current.scroll);
        });
      }
    }
    document.addEventListener('keydown', back);
    return () => document.removeEventListener('keydown', back);
  }, [page]);
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

  function navigate(next: 'home' | 'browse', focusSearch = false) {
    if (next === 'browse' && page === 'browse' && focusSearch) {
      search.current?.focus();
      search.current?.scrollIntoView({ block: 'nearest' });
      return;
    }
    if (page === 'home' && next === 'browse') {
      discover.current = { scroll: window.scrollY, trigger: document.activeElement instanceof HTMLElement ? document.activeElement : null };
    }
    setPage(next);
    requestAnimationFrame(() => {
      if (next === 'home' && page === 'browse') {
        discover.current.trigger?.focus({ preventScroll: true });
        window.scrollTo(0, discover.current.scroll);
      } else {
        window.scrollTo(0, 0);
        (focusSearch ? search.current : heading.current)?.focus({ preventScroll: true });
      }
    });
  }
  function browseCategory(next: string) { setCategory(next); setQuery(''); navigate('browse'); }
  function retry() { setCatalog({ status: 'loading' }); setAttempt(value => value + 1); }
  function clearFilters() { setQuery(''); setCategory('All'); setSort('curated'); }

  const entries = catalog.status === 'ready' ? catalog.entries : [];
  const featured = entries[0];
  const visible = sortCatalog(filterCatalog(entries, query, category), sort);

  return <div className="shell">
    <a className="skip-link" href="#content">Skip to catalog</a>
    <AppNavigation page={page} onNavigate={next => navigate(next)} onSearch={() => navigate('browse', true)} />
    {!online && <p className="offline" role="status">You’re offline. Loaded mock entries remain available; retry loading after reconnecting.</p>}
    <main id="content" tabIndex={-1}>
      <div ref={heading} tabIndex={-1} className="page-focus" role="group" aria-label={page === 'home' ? 'Discover' : 'Browse'}>
        {page === 'browse' && <div className="page-heading"><div><p className="eyebrow">The Voidplay collection</p><h1>Browse applications</h1></div><p role="status">{visible.length} {visible.length === 1 ? 'application' : 'applications'} <span>· Mock catalog</span></p></div>}
      </div>
      {catalog.status === 'loading' ? <section className="message" role="status"><h2>Loading local catalog…</h2><p>Reading the preview fixture.</p></section>
        : catalog.status === 'error' ? <section className="message" role="alert"><h2>Catalog unavailable</h2><p>The local catalog could not be loaded or its metadata is invalid.</p><button onClick={retry}>Retry catalog</button></section>
        : entries.length === 0 ? <section className="message"><h2>No applications yet</h2><p>The catalog is empty. Reload after entries have been added.</p><button onClick={retry}>Reload catalog</button></section>
        : <>
          <div hidden={page !== 'home'}>
          {featured && <FeaturedHero entry={featured} onSelect={setSelected} onBrowse={() => browseCategory(featured.category)} />}
          <div className="home-shelves"><p className="collection-note">Curated for the preview <span>No popularity or rating data</span></p>
            <ContentShelf title="Homebrew spotlight" entries={entries} onSelect={setSelected} onBrowse={() => browseCategory('All')} />
            <ContentShelf title="Tools & utilities" entries={entries.filter(entry => entry.category === 'Utilities')} onSelect={setSelected} onBrowse={() => browseCategory('Utilities')} />
            <ContentShelf title="Picture & sound" entries={entries.filter(entry => entry.category === 'Media')} onSelect={setSelected} onBrowse={() => browseCategory('Media')} />
          </div>
          </div><div hidden={page !== 'browse'}>
          <form className="filters" role="search" onSubmit={event => event.preventDefault()}>
            <label>Search applications<input ref={search} type="search" value={query} placeholder="Title, description, or category" onChange={event => setQuery(event.target.value)} /></label>
            <label>Category<select value={category} onChange={event => setCategory(event.target.value)}><option>All</option><option>Utilities</option><option>Games</option><option>Media</option></select></label>
            <label>Sort by<select value={sort} onChange={event => setSort(event.target.value)}><option value="curated">Curated order</option><option value="title">Title A–Z</option></select></label>
            <button type="button" onClick={clearFilters}>Clear filters</button>
          </form>
          <section className="catalog" aria-label="Application catalog">
            {visible.length > 0 ? <ul className="app-grid">{visible.map(entry => <ContentPoster key={entry.id} entry={entry} onSelect={setSelected} />)}</ul>
              : <div className="message"><h2>No matching applications</h2><p>Try another search or clear your category selection.</p><button onClick={clearFilters}>Clear filters</button></div>}
          </section>
          </div>
        </>}
    </main>
    <footer><p><strong>Voidplay desktop preview.</strong> Fictional mock listings and original concept artwork. No downloads or installation.</p><p>Tab / Arrows: navigate <span>Enter: details</span> <span>Esc: back</span> · PS4 controller support unverified</p></footer>
    {selected && <Details entry={selected} onClose={() => setSelected(null)} />}
  </div>;
}
