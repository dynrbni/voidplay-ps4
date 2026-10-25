import { useState } from 'react';
import type { CatalogEntry } from './catalog.ts';

export function Artwork({ entry }: { entry: CatalogEntry }) {
  const [failedUrl, setFailedUrl] = useState<string>();
  return entry.coverUrl && failedUrl !== entry.coverUrl
    ? <img src={entry.coverUrl} alt="" onError={() => setFailedUrl(entry.coverUrl)} />
    : <span className="art-fallback"><strong>{entry.title}</strong><span>Artwork unavailable</span></span>;
}

export function ContentPoster({ entry, onSelect }: { entry: CatalogEntry; onSelect: (entry: CatalogEntry) => void }) {
  return <li><button className="app-card" onClick={() => onSelect(entry)} aria-label={`View ${entry.title} (mock)`}>
    <span className="cover"><Artwork entry={entry} /><span className="art-label">Concept artwork</span></span>
    <span className="card-info"><strong>{entry.title}</strong><span className="category">{entry.category} <span aria-hidden="true">·</span> Mock</span></span>
  </button></li>;
}
