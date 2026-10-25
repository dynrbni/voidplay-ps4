import { useEffect, useRef, useState } from 'react';
import { loadCatalog } from './catalog.ts';
import type { CatalogEntry } from './catalog.ts';
import { Details } from './Details.tsx';
import { installKeyboardNavigation } from './navigation.ts';
import { AppNavigation } from './AppNavigation.tsx';
import { FeaturedHero } from './FeaturedHero.tsx';
import { ContentShelf } from './ContentShelf.tsx';
import { CatalogView } from './CatalogView.tsx';
import { CollectionView } from './CollectionView.tsx';
import { Downloads, Settings } from './SecondaryPages.tsx';
import { useCollections } from './useCollections.ts';
import { useStoreNavigation } from './useStoreNavigation.ts';
import type { Page } from './routes.ts';

type CatalogState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; entries: CatalogEntry[] };
const initialFilters = { query: '', category: 'All', sort: 'curated' };

export function App() {
  const [catalog, setCatalog] = useState<CatalogState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [browseFilters, setBrowseFilters] = useState(initialFilters);
  const [searchFilters, setSearchFilters] = useState(initialFilters);
  const [online, setOnline] = useState(navigator.onLine);
  const search = useRef<HTMLInputElement>(null);
  const browseSearch = useRef<HTMLInputElement>(null);
  const { route, navigate, back, focusHeading } = useStoreNavigation();
  const collections = useCollections();

  useEffect(installKeyboardNavigation, []);
  useEffect(() => {
    if (document.activeElement === document.body) focusHeading.current?.focus({ preventScroll: true });
  }, [catalog.status, focusHeading]);
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
  useEffect(() => {
    if (route.page === 'search' && catalog.status === 'ready' && document.activeElement === focusHeading.current) {
      search.current?.focus({ preventScroll: true });
    }
  }, [route.page, catalog.status, focusHeading]);

  function navigatePage(page: Page) {
    navigate({ page });
    if (page === 'search') search.current?.focus({ preventScroll: true });
  }
  function browseCategory(category: string) {
    setBrowseFilters({ ...initialFilters, category });
    navigatePage('browse');
  }
  function retry() { setCatalog({ status: 'loading' }); setAttempt(value => value + 1); }
  function select(entry: CatalogEntry) { navigate({ page: 'item', id: entry.id }); }

  const entries = catalog.status === 'ready' ? catalog.entries : [];
  const featured = ['orbit-workshop', 'local-player', 'pixel-forge'].flatMap(id => entries.filter(entry => entry.id === id));
  const featuredEntries = featured.length ? featured : entries.slice(0, 3);
  const spotlight = [...entries].sort((a, b) => Number(b.id === 'orbit-workshop') - Number(a.id === 'orbit-workshop'));
  const selected = route.page === 'item' ? entries.find(entry => entry.id === route.id) : undefined;
  const page = route.page;
  const label = page === 'item' ? selected?.title ?? 'Application details' : page.charAt(0).toUpperCase() + page.slice(1);

  return <div className="shell" data-reduce-motion={collections.data.reduceMotion}>
    <a className="skip-link" href="#content" onClick={event => { event.preventDefault(); focusHeading.current?.focus(); }}>Skip to content</a>
    <AppNavigation page={page} onNavigate={navigatePage}/>
    {!online && <p className="offline" role="status">You’re offline. Already loaded concepts remain available. Reconnect before reloading the catalog.</p>}
    {collections.warning && <p className="storage-warning" role="status">{collections.warning}</p>}
    <main id="content"><div ref={focusHeading} tabIndex={-1} className="page-focus" role="group" aria-label={label}>
      {catalog.status === 'loading' ? <section className="loading-state" role="status"><div className="loading-line"/><p className="eyebrow">A little space for discovery</p><h1>Loading local catalog…</h1><p>Reading the concept collection.</p></section>
        : catalog.status === 'error' ? <section className="message page-message" role="alert"><h1>Catalog unavailable</h1><p>The local catalog could not be loaded or its metadata is invalid.</p><button className="primary" onClick={retry}>Retry catalog</button></section>
        : <>
          <div hidden={page !== 'discover'}>
            {entries.length ? <>
              <FeaturedHero entries={featuredEntries} favorites={collections.data.favorites} onSelect={select} onFavorite={id => collections.toggle('favorites', id)}/>
              <div className="home-shelves"><ContentShelf title="Made to explore" subtitle="Original concepts. Independent possibilities." entries={spotlight} onSelect={select} onBrowse={() => browseCategory('All')}/>
                <ContentShelf title="Tools for your next idea" subtitle="A closer look at the utilities collection" entries={entries.filter(entry => entry.category === 'Utilities')} onSelect={select} onBrowse={() => browseCategory('Utilities')} format="landscape"/>
                <ContentShelf title="Picture & sound" entries={entries.filter(entry => entry.category === 'Media')} onSelect={select} onBrowse={() => browseCategory('Media')} format="landscape"/>
              </div>
            </> : <section className="message page-message"><h1>No applications yet</h1><p>The catalog is empty. Reload after entries have been added.</p><button onClick={retry}>Reload catalog</button></section>}
          </div>
          <div hidden={page !== 'browse'}><CatalogView entries={entries} mode="browse" {...browseFilters} onQuery={query => setBrowseFilters(value => ({ ...value, query }))} onCategory={category => setBrowseFilters(value => ({ ...value, category }))} onSort={sort => setBrowseFilters(value => ({ ...value, sort }))} onSelect={select} searchRef={browseSearch}/></div>
          <div hidden={page !== 'search'}><CatalogView entries={entries} mode="search" {...searchFilters} onQuery={query => setSearchFilters(value => ({ ...value, query }))} onCategory={category => setSearchFilters(value => ({ ...value, category }))} onSort={sort => setSearchFilters(value => ({ ...value, sort }))} onSelect={select} searchRef={search}/></div>
          <div hidden={page !== 'favorites'}><CollectionView kind="favorites" entries={entries.filter(entry => collections.data.favorites.includes(entry.id))} onSelect={select} onBrowse={() => browseCategory('All')}/></div>
          <div hidden={page !== 'library'}><CollectionView kind="library" entries={entries.filter(entry => collections.data.library.includes(entry.id))} onSelect={select} onBrowse={() => browseCategory('All')}/></div>
          <div hidden={page !== 'downloads'}><Downloads onBrowse={() => browseCategory('All')}/></div>
          <div hidden={page !== 'settings'}><Settings count={entries.length} reduceMotion={collections.data.reduceMotion} onReduceMotion={collections.setReduceMotion} onReload={retry}/></div>
          {selected && <Details key={selected.id} entry={selected} entries={entries} favorite={collections.data.favorites.includes(selected.id)} tracked={collections.data.library.includes(selected.id)} onClose={back} onSelect={select} onFavorite={() => collections.toggle('favorites', selected.id)} onTrack={() => collections.toggle('library', selected.id)}/>}
          {(page === 'missing' || page === 'item' && !selected) && <section className="message page-message"><h1>That discovery isn’t here.</h1><p>This address doesn’t match a listing in the current catalog.</p><button className="primary" onClick={() => navigatePage('discover')}>Back to Discover</button></section>}
        </>}
    </div></main>
    <footer><div className="footer-identity"><span className="footer-brand">voidplay.</span><p>Independent by nature. Open to possibility.</p></div><div className="footer-info"><p>Desktop concept preview · Original artwork · No packages</p><p><kbd>Arrows</kbd> Navigate <kbd>Enter</kbd> Select <kbd>Esc</kbd> Back<span>PS4 runtime unverified</span></p></div></footer>
  </div>;
}
