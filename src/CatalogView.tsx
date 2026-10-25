import type { Ref } from 'react';
import { filterCatalog, sortCatalog } from './catalog.ts';
import type { CatalogEntry } from './catalog.ts';
import { ContentPoster } from './ContentPoster.tsx';
import { Icon } from './Icon.tsx';

export function CatalogView({ entries, mode, query, category, sort, onQuery, onCategory, onSort, onSelect, searchRef }: {
  entries: CatalogEntry[]; mode: 'browse' | 'search'; query: string; category: string; sort: string;
  onQuery: (value: string) => void; onCategory: (value: string) => void; onSort: (value: string) => void;
  onSelect: (entry: CatalogEntry) => void; searchRef: Ref<HTMLInputElement>;
}) {
  const visible = sortCatalog(filterCatalog(entries, query, category), sort);
  const categories = ['All', ...new Set(entries.map(entry => entry.category))];
  function clear() { onQuery(''); onCategory('All'); onSort('curated'); }
  return <div className={`catalog-page ${mode === 'search' ? 'search-page' : ''}`}>
    <div className="page-heading"><div><p className="eyebrow">The Voidplay collection</p><h1>{mode === 'browse' ? 'Find your next discovery.' : 'What are you looking for?'}</h1></div><p className="catalog-count" role="status">{visible.length}<span>of {entries.length} concepts</span></p></div>
    <form className="filters" role="search" onSubmit={event => event.preventDefault()}>
      <label className="search-field"><span className="sr-only">Search applications</span><Icon name="search"/><input ref={searchRef} type="search" value={query} placeholder="Search titles, tools, and possibilities" onChange={event => onQuery(event.target.value)}/></label>
      <label className="sort-field">Sort by<select value={sort} onChange={event => onSort(event.target.value)}><option value="curated">Curated order</option><option value="title">Title A–Z</option></select></label>
    </form>
    <div className="category-bar"><div className="category-tabs" role="group" aria-label="Filter by category">{categories.map(item => <button key={item} aria-pressed={category === item} onClick={() => onCategory(item)}>{item === 'All' ? 'All applications' : item}</button>)}</div>{query || category !== 'All' || sort !== 'curated' ? <button className="text-button" onClick={clear}>Clear filters</button> : null}</div>
    <section className="catalog" aria-label="Application catalog">
      {visible.length ? <ul className="app-grid">{visible.map(entry => <ContentPoster key={entry.id} entry={entry} onSelect={onSelect}/>)}</ul>
        : <div className="message"><Icon name="search"/><h2>No matching applications</h2><p>Try a different title or explore another category.</p><button onClick={clear}>Clear filters</button></div>}
    </section>
    <p className="catalog-note">Original concept listings, made for the Voidplay preview. No downloads or installation.</p>
  </div>;
}
