import { useId, useRef, useState } from 'react';
import type { CatalogEntry } from './catalog.ts';
import { ContentPoster } from './ContentPoster.tsx';
import { Icon } from './Icon.tsx';

export function ContentShelf({ title, entries, onSelect, onBrowse, favorites, onFavorite, highlightedId, onHighlight, format = 'poster' }: {
  title: string; entries: CatalogEntry[]; onSelect: (entry: CatalogEntry) => void; onBrowse?: () => void;
  favorites: string[]; onFavorite: (id: string) => void; highlightedId?: string; onHighlight?: (id: string) => void; format?: 'poster' | 'landscape';
}) {
  const id = useId();
  const row = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  if (!entries.length) return null;
  function move(offset: number) {
    const cards = row.current?.querySelectorAll<HTMLButtonElement>('.app-card');
    if (!cards?.length) return;
    cards[Math.max(0, Math.min(cards.length - 1, index + offset))]?.focus({ preventScroll: true });
  }
  return <section className={`content-shelf shelf-${format}`} aria-labelledby={id}>
    <div className="shelf-heading"><h2 id={id}>{title}</h2><div className="shelf-actions">
      {onBrowse && <button className="text-button" onClick={onBrowse}>View all<Icon name="right"/><span className="sr-only"> {title}</span></button>}
      <button className="shelf-arrow" aria-label={`Previous in ${title}`} disabled={index === 0} onClick={() => move(-1)}><Icon name="left"/></button>
      <button className="shelf-arrow" aria-label={`Next in ${title}`} disabled={index === entries.length - 1} onClick={() => move(1)}><Icon name="right"/></button>
    </div></div>
    <ul className="shelf-row" ref={row} data-focus-row onFocus={event => {
      const card = event.target.closest('.poster-item')?.querySelector<HTMLButtonElement>('.app-card');
      if (!card) return;
      if (card.dataset.entryId) onHighlight?.(card.dataset.entryId);
      setIndex(Array.from(row.current?.querySelectorAll('.app-card') ?? []).indexOf(card));
      card.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches || document.querySelector('[data-reduce-motion="true"]') ? 'instant' : 'smooth' });
    }}>{entries.map(entry => <ContentPoster key={entry.id} entry={entry} onSelect={onSelect} favorite={favorites.includes(entry.id)} onFavorite={onFavorite} highlighted={highlightedId === entry.id} onHighlight={onHighlight}/>)}</ul>
  </section>;
}
