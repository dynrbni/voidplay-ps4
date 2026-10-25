import { useState } from 'react';
import type { CatalogEntry } from './catalog.ts';
import { FavoriteButton } from './FavoriteButton.tsx';

export function Artwork({ entry, source, eager = false }: { entry: CatalogEntry; source?: string; eager?: boolean }) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const url = source ?? entry.coverUrl;
  return url && failedUrl !== url
    ? <img src={url} alt="" loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailedUrl(url)}/>
    : <span className="art-fallback"><strong>{entry.title}</strong><span>Artwork unavailable</span></span>;
}

export function ContentPoster({ entry, onSelect, favorite, onFavorite, highlighted, onHighlight }: {
  entry: CatalogEntry; onSelect: (entry: CatalogEntry) => void; favorite: boolean; onFavorite: (id: string) => void; highlighted?: boolean; onHighlight?: (id: string) => void;
}) {
  return <li className="poster-item"><button className="app-card" data-entry-id={entry.id} data-highlighted={highlighted || undefined} onFocus={() => onHighlight?.(entry.id)} onPointerEnter={() => onHighlight?.(entry.id)} onClick={() => onSelect(entry)} aria-label={`View ${entry.title} (concept)`}>
    <span className="cover"><Artwork entry={entry}/></span><span className="card-info"><strong>{entry.title}</strong><span className="category">{entry.category}<span aria-hidden="true"> / </span>Concept</span></span>
  </button><FavoriteButton title={entry.title} saved={favorite} onToggle={() => onFavorite(entry.id)}/></li>;
}
