import { useState } from 'react';
import type { CatalogEntry } from './catalog.ts';
import { Artwork } from './ContentPoster.tsx';
import { Icon } from './Icon.tsx';

export function FeaturedHero({ entries, favorites, onSelect, onFavorite }: {
  entries: CatalogEntry[]; favorites: string[]; onSelect: (entry: CatalogEntry) => void; onFavorite: (id: string) => void;
}) {
  const [active, setActive] = useState(0);
  const entry = entries[active] ?? entries[0];
  if (!entry) return null;
  const saved = favorites.includes(entry.id);
  return <section className="featured" aria-labelledby="featured-title">
    <div className="hero-art" key={entry.id}><Artwork entry={entry} source={entry.heroUrl} eager /></div>
    <div className="hero-shade" />
    <div className="featured-copy">
      <p className="eyebrow spotlight-label"><span className="spotlight-mark" aria-hidden="true" />The homebrew spotlight</p>
      <h1 id="featured-title" className={entry.id === 'orbit-workshop' ? 'orbital-title' : ''}>{entry.title}</h1>
      <p className="hero-category">{entry.category}<span aria-hidden="true">·</span>Original concept</p>
      <p className="hero-description">{entry.summary ?? entry.description}</p>
      <div className="hero-actions"><button className="primary" onClick={() => onSelect(entry)}><Icon name="info"/>View details</button>
        <button className="secondary" aria-pressed={saved} onClick={() => onFavorite(entry.id)}><Icon name={saved ? 'check' : 'plus'}/>{saved ? 'In favorites' : 'Add to favorites'}</button></div>
      <p className="hero-disclosure">Concept preview. No downloadable package.</p>
    </div>
    <div className="featured-selector" role="group" aria-label="Featured concepts">
      <span className="feature-counter">{String(active + 1).padStart(2, '0')}<span> / {String(entries.length).padStart(2, '0')}</span></span>
      {entries.map((item, index) => <button key={item.id} className="feature-choice" aria-label={`Feature ${item.title}`} aria-pressed={active === index} onClick={() => setActive(index)}><span /></button>)}
    </div>
  </section>;
}
