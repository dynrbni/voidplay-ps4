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
import { Settings } from './SecondaryPages.tsx';
import { Downloads } from './Downloads.tsx';
import { useDemoTransfers } from './useDemoTransfers.ts';
import { useCollections } from './useCollections.ts';
import { useStoreNavigation } from './useStoreNavigation.ts';
import type { Page } from './routes.ts';

type CatalogState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; entries: CatalogEntry[] };
const initialFilters = { query: '', category: 'All', sort: 'curated' };

export function App() {
  const [catalog, setCatalog] = useState<CatalogState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [featuredId, setFeaturedId] = useState('orbit-workshop');
  const [browseFilters, setBrowseFilters] = useState(initialFilters);
  const [searchFilters, setSearchFilters] = useState(initialFilters);
  const [online, setOnline] = useState(navigator.onLine);
  const search = useRef<HTMLInputElement>(null);
  const browseSearch = useRef<HTMLInputElement>(null);
  const { route, navigate, back, focusHeading } = useStoreNavigation();
  const collections = useCollections();
  const transfers = useDemoTransfers();

  useEffect(installKeyboardNavigation, []);
  useEffect(() => {
    if (document.activeElement === document.body) focusHeading.current?.focus({ preventScroll: true });
  }, [catalog.status, focusHeading, collections.data.favorites.length, transfers.jobs.length]);
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
  function toggleFavorite(id: string) { collections.toggle('favorites', id); }
  function download(entry: CatalogEntry) {
    transfers.start(entry.id);
    navigatePage('downloads');
  }

  const entries = catalog.status === 'ready' ? catalog.entries : [];
  const featured = entries.find(entry => entry.id === featuredId) ?? entries[0];
  const spotlight = [...entries].sort((a, b) => Number(b.id === 'orbit-workshop') - Number(a.id === 'orbit-workshop'));
  const selected = route.page === 'item' ? entries.find(entry => entry.id === route.id) : undefined;
  const page = route.page;
  const label = page === 'item' ? selected?.title ?? 'Application details' : page.charAt(0).toUpperCase() + page.slice(1);

  return <div className="shell" data-reduce-motion={collections.data.reduceMotion}>
    <a className="skip-link" href="#content" onClick={event => { event.preventDefault(); focusHeading.current?.focus(); }}>Skip to content</a>
    <AppNavigation page={page} onNavigate={navigatePage} transferCount={transfers.jobs.filter(job => job.status === 'downloading' || job.status === 'queued').length}/>
    {!online && <p className="offline" role="status">You’re offline. Already loaded concepts remain available. Reconnect before reloading the catalog.</p>}
    {transfers.warning && <p className="storage-warning" role="status">{transfers.warning}</p>}
    {collections.warning && <p className="storage-warning" role="status">{collections.warning}</p>}
    <main id="content"><div ref={focusHeading} tabIndex={-1} className="page-focus" role="group" aria-label={label}>
      {catalog.status === 'loading' ? <section className="loading-state" role="status"><div className="loading-line"/><p className="eyebrow">A little space for discovery</p><h1>Loading local catalog…</h1><p>Reading the concept collection.</p></section>
        : catalog.status === 'error' ? <section className="message page-message" role="alert"><h1>Catalog unavailable</h1><p>The local catalog could not be loaded or its metadata is invalid.</p><button className="primary" onClick={retry}>Retry catalog</button></section>
        : <>
          <div hidden={page !== 'discover'}>
            {entries.length ? <>
              {featured && <FeaturedHero entry={featured} favorite={collections.data.favorites.includes(featured.id)} onSelect={select} onFavorite={() => toggleFavorite(featured.id)}/>}
              <div className="home-shelves"><ContentShelf title="Discover on Voidplay" entries={spotlight} onSelect={select} onBrowse={() => browseCategory('All')} favorites={collections.data.favorites} onFavorite={toggleFavorite} highlightedId={featured?.id} onHighlight={setFeaturedId}/>
                <ContentShelf title="Tools & utilities" entries={entries.filter(entry => entry.category === 'Utilities')} onSelect={select} onBrowse={() => browseCategory('Utilities')} favorites={collections.data.favorites} onFavorite={toggleFavorite} format="landscape"/>
                <ContentShelf title="Picture & sound" entries={entries.filter(entry => entry.category === 'Media')} onSelect={select} onBrowse={() => browseCategory('Media')} favorites={collections.data.favorites} onFavorite={toggleFavorite} format="landscape"/>
              </div>
            </> : <section className="message page-message"><h1>No applications yet</h1><p>The catalog is empty. Reload after entries have been added.</p><button onClick={retry}>Reload catalog</button></section>}
          </div>
          <div hidden={page !== 'browse'}><CatalogView entries={entries} mode="browse" {...browseFilters} onQuery={query => setBrowseFilters(value => ({ ...value, query }))} onCategory={category => setBrowseFilters(value => ({ ...value, category }))} onSort={sort => setBrowseFilters(value => ({ ...value, sort }))} onSelect={select} searchRef={browseSearch} favorites={collections.data.favorites} onFavorite={toggleFavorite}/></div>
          <div hidden={page !== 'search'}><CatalogView entries={entries} mode="search" {...searchFilters} onQuery={query => setSearchFilters(value => ({ ...value, query }))} onCategory={category => setSearchFilters(value => ({ ...value, category }))} onSort={sort => setSearchFilters(value => ({ ...value, sort }))} onSelect={select} searchRef={search} favorites={collections.data.favorites} onFavorite={toggleFavorite}/></div>
          <div hidden={page !== 'favorites'}><CollectionView kind="favorites" entries={entries.filter(entry => collections.data.favorites.includes(entry.id))} onSelect={select} onBrowse={() => browseCategory('All')} favorites={collections.data.favorites} onFavorite={toggleFavorite}/></div>
          <div hidden={page !== 'library'}><CollectionView kind="library" entries={entries.filter(entry => collections.data.library.includes(entry.id))} onSelect={select} onBrowse={() => browseCategory('All')} favorites={collections.data.favorites} onFavorite={toggleFavorite}/></div>
          <div hidden={page !== 'downloads'}><Downloads entries={entries} jobs={transfers.jobs} onCommand={transfers.command} onClear={transfers.clearFinished} onBrowse={() => browseCategory('All')} onSelect={select}/></div>
          <div hidden={page !== 'settings'}><Settings count={entries.length} reduceMotion={collections.data.reduceMotion} onReduceMotion={collections.setReduceMotion} onReload={retry}/></div>
          {selected && <Details key={selected.id} entry={selected} entries={entries} favorites={collections.data.favorites} transfer={transfers.jobs.find(job => job.entryId === selected.id)} tracked={collections.data.library.includes(selected.id)} onClose={back} onSelect={select} onFavorite={toggleFavorite} onDownload={() => download(selected)} onTrack={() => collections.toggle('library', selected.id)}/>}
          {(page === 'missing' || page === 'item' && !selected) && <section className="message page-message"><h1>That discovery isn’t here.</h1><p>This address doesn’t match a listing in the current catalog.</p><button className="primary" onClick={() => navigatePage('discover')}>Back to Discover</button></section>}
        </>}
    </div></main>
    <footer><div className="footer-identity"><span className="footer-brand">voidplay.</span><p>Independent by nature. Open to possibility.</p></div><div className="footer-info"><p>Beta preview · Original concepts · Demo downloads</p><p><kbd>Arrows</kbd> Navigate <kbd>Enter</kbd> Select <kbd>Esc</kbd> Back<span>PS4 runtime unverified</span></p></div></footer>
  </div>;
}
