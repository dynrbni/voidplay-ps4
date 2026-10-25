import type { CatalogEntry } from './catalog.ts';
import type { CollectionName } from './collections.ts';
import { ContentPoster } from './ContentPoster.tsx';
import { Icon } from './Icon.tsx';

export function CollectionView({ kind, entries, onSelect, onBrowse }: {
  kind: CollectionName; entries: CatalogEntry[]; onSelect: (entry: CatalogEntry) => void; onBrowse: () => void;
}) {
  const favorite = kind === 'favorites';
  return <div className="collection-page"><div className="page-heading"><div><p className="eyebrow">Your corner of Voidplay</p><h1>{favorite ? 'Worth coming back to.' : 'Your library.'}</h1><p>{favorite ? 'The concepts you love, all in one place.' : 'Listings you choose to keep track of. Separate from favorites and installed applications.'}</p></div><p className="catalog-count">{entries.length}<span>{entries.length === 1 ? 'saved concept' : 'saved concepts'}</span></p></div>
    {entries.length ? <section className="catalog" aria-label={favorite ? 'Favorite applications' : 'Tracked applications'}><ul className="app-grid">{entries.map(entry => <ContentPoster key={entry.id} entry={entry} onSelect={onSelect}/>)}</ul></section>
      : <section className="message"><Icon name={favorite ? 'heart' : 'library'}/><h2>{favorite ? 'Your next favorite is out there.' : 'A little space for your discoveries.'}</h2><p>{favorite ? 'Add a concept to favorites from its detail page or the featured spotlight.' : 'Open a concept and choose Add to library to start your collection. This tracks the listing without installing it.'}</p><button className="primary" onClick={onBrowse}>Explore the collection<Icon name="right"/></button></section>}
    <p className="catalog-note">Saved in this browser. Clearing site data removes your collections; they do not sync across devices.</p>
  </div>;
}
