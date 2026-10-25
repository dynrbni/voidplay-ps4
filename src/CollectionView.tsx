import type { CatalogEntry } from './catalog.ts';
import type { CollectionName } from './collections.ts';
import { ContentPoster } from './ContentPoster.tsx';
import { Icon } from './Icon.tsx';

export function CollectionView({ kind, entries, onSelect, onBrowse, favorites, onFavorite }: {
  favorites: string[]; onFavorite: (id: string) => void; kind: CollectionName; entries: CatalogEntry[]; onSelect: (entry: CatalogEntry) => void; onBrowse: () => void;
}) {
  const favorite = kind === 'favorites';
  return <div className="collection-page"><div className="page-heading"><div><p className="eyebrow">Your corner of Voidplay</p><h1>{favorite ? 'Worth coming back to.' : 'Your library.'}</h1><p>{favorite ? 'Your favorite applications, saved here.' : 'Listings you choose to keep track of. Separate from favorites and installed applications.'}</p></div><p className="catalog-count">{entries.length}<span>{entries.length === 1 ? 'saved entry' : 'saved entries'}</span></p></div>
    {entries.length ? <section className="catalog" aria-label={favorite ? 'Favorite applications' : 'Tracked applications'}><ul className="app-grid">{entries.map(entry => <ContentPoster key={entry.id} entry={entry} onSelect={onSelect} favorite={favorites.includes(entry.id)} onFavorite={onFavorite}/>)}</ul></section>
      : <section className="message"><Icon name={favorite ? 'heart' : 'library'}/><h2>{favorite ? 'Your next favorite is out there.' : 'A little space for your discoveries.'}</h2><p>{favorite ? 'Select the heart beside any application to keep it here.' : 'Open an application and choose Add to library to start your collection. This tracks the listing without installing it.'}</p><button className="primary" onClick={onBrowse}>Explore the collection<Icon name="right"/></button></section>}
    <p className="catalog-note">Saved in this browser. Clearing site data removes your collections; they do not sync across devices.</p>
  </div>;
}
