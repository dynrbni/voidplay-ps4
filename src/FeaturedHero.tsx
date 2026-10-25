import type { CatalogEntry } from './catalog.ts';
import { Artwork } from './ContentPoster.tsx';

export function FeaturedHero({ entry, onSelect, onBrowse }: {
  entry: CatalogEntry; onSelect: (entry: CatalogEntry) => void; onBrowse: () => void;
}) {
  return <section className="featured" aria-labelledby="featured-title">
    <div className="hero-art"><Artwork entry={entry} /></div>
    <div className="hero-shade" />
    <div className="featured-copy">
      <p className="eyebrow">Featured on Voidplay <span aria-hidden="true">/</span> {entry.category}</p>
      <h1 id="featured-title">{entry.title}</h1>
      <p className="hero-description">{entry.description}</p>
      <div className="hero-actions"><button className="primary" onClick={() => onSelect(entry)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/></svg>View details</button>
        <button onClick={onBrowse}>Browse {entry.category.toLowerCase()}</button></div>
      <p className="hero-disclosure">Mock application · Original concept artwork · PS4 runtime unverified</p>
    </div>
  </section>;
}
