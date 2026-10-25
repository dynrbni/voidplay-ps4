import { useId, useRef } from 'react';
import type { CatalogEntry } from './catalog.ts';
import { ContentPoster } from './ContentPoster.tsx';

export function ContentShelf({ title, entries, onSelect, onBrowse }: {
  title: string; entries: CatalogEntry[]; onSelect: (entry: CatalogEntry) => void; onBrowse: () => void;
}) {
  const id = useId();
  const row = useRef<HTMLUListElement>(null);
  if (!entries.length) return null;

  function move(offset: number) {
    const cards = row.current?.querySelectorAll<HTMLButtonElement>('.app-card');
    if (!cards?.length) return;
    const visible = Array.from(cards).findIndex(card => card.getBoundingClientRect().left >= row.current!.getBoundingClientRect().left - 2);
    cards[Math.max(0, Math.min(cards.length - 1, visible + offset))]?.focus();
  }

  return <section className="content-shelf" aria-labelledby={id}>
    <div className="shelf-heading"><h2 id={id}>{title}</h2><div className="shelf-actions">
      <button className="text-button" onClick={onBrowse}>View all<span className="sr-only"> {title}</span></button>
      <button className="shelf-arrow" aria-label={`Previous in ${title}`} onClick={() => move(-1)}>‹</button>
      <button className="shelf-arrow" aria-label={`Next in ${title}`} onClick={() => move(1)}>›</button>
    </div></div>
    <ul className="shelf-row" ref={row} data-focus-row onFocus={event => event.target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' })}>
      {entries.map(entry => <ContentPoster key={entry.id} entry={entry} onSelect={onSelect} />)}
    </ul>
  </section>;
}
