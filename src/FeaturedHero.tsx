import type { CatalogEntry } from './catalog.ts';
import { Artwork } from './ContentPoster.tsx';
import { FavoriteButton } from './FavoriteButton.tsx';

export function FeaturedHero({ entry, favorite, onSelect, onFavorite }: {
  entry: CatalogEntry; favorite: boolean; onSelect: (entry: CatalogEntry) => void; onFavorite: () => void;
}) {
  return <section className="featured" aria-labelledby="featured-title">
    <div className="hero-art" key={entry.id}><Artwork entry={entry} source={entry.heroUrl} eager/></div><div className="hero-shade"/>
    <div className="featured-copy"><p className="eyebrow">Discover</p><h1 id="featured-title">{entry.title}</h1>
      <p className="hero-description">{entry.summary ?? entry.description}</p>
      <div className="hero-actions"><button className="primary" onClick={() => onSelect(entry)}>View application</button><FavoriteButton title={entry.title} saved={favorite} onToggle={onFavorite}/></div>
      <p className="hero-disclosure">Original concept · Demo downloads</p>
    </div>
  </section>;
}
