import { useState } from 'react';
import { publicAsset } from './assets.ts';
import type { CatalogEntry } from './catalog.ts';
import { FavoriteButton } from './FavoriteButton.tsx';

export function Artwork({ entry, source, eager = false }: { entry: CatalogEntry; source?: string; eager?: boolean }) {
  const [failedUrls, setFailedUrls] = useState<string[]>([]);
  const url = [source, entry.coverUrl, entry.heroUrl].find(value => value && !failedUrls.includes(value));
  return url
    ? <img src={publicAsset(url)} referrerPolicy="no-referrer" alt="" loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailedUrls(previous => [...previous, url])}/>
    : <span className="art-fallback"><strong>{entry.title}</strong><span>Artwork unavailable</span></span>;
}

export function ContentPoster({ entry, onSelect, favorite, onFavorite, highlighted, onHighlight }: {
  entry: CatalogEntry; onSelect: (entry: CatalogEntry) => void; favorite: boolean; onFavorite: (id: string) => void; highlighted?: boolean; onHighlight?: (id: string) => void;
}) {
  return <li className="poster-item"><button className="app-card" data-entry-id={entry.id} data-highlighted={highlighted || undefined} onFocus={() => onHighlight?.(entry.id)} onPointerEnter={() => onHighlight?.(entry.id)} onClick={() => onSelect(entry)} aria-label={`View ${entry.title}${entry.mock ? ' (concept)' : ''}`}>
    <span className="cover"><Artwork entry={entry}/></span><span className="card-info"><strong>{entry.title}</strong><span className="category">{entry.category}<span aria-hidden="true"> / </span>{entry.mock ? 'Concept' : entry.version}</span></span>
  </button><FavoriteButton title={entry.title} saved={favorite} onToggle={() => onFavorite(entry.id)}/></li>;
}
