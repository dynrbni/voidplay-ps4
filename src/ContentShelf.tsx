import { useId, useRef, useState } from 'react';
import type { CatalogEntry } from './catalog.ts';
import { ContentPoster } from './ContentPoster.tsx';
import { Icon } from './Icon.tsx';

export function ContentShelf({ title, subtitle, entries, onSelect, onBrowse, format = 'poster' }: {
  title: string; subtitle?: string; entries: CatalogEntry[]; onSelect: (entry: CatalogEntry) => void; onBrowse?: () => void; format?: 'poster' | 'landscape';
}) {
  const id = useId();
  const row = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  if (!entries.length) return null;

  function move(offset: number) {
    const cards = row.current?.querySelectorAll<HTMLButtonElement>('.app-card');
    if (!cards?.length) return;
    const next = Math.max(0, Math.min(cards.length - 1, index + offset));
    cards[next]?.focus({ preventScroll: true });
  }
  return <section className={`content-shelf shelf-${format}`} aria-labelledby={id}>
    <div className="shelf-heading"><div><h2 id={id}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><div className="shelf-actions">
      {onBrowse && <button className="text-button" onClick={onBrowse}>Explore all<Icon name="right"/><span className="sr-only"> {title}</span></button>}
      <button className="shelf-arrow" aria-label={`Previous in ${title}`} disabled={index === 0} onClick={() => move(-1)}><Icon name="left"/></button>
      <button className="shelf-arrow" aria-label={`Next in ${title}`} disabled={index === entries.length - 1} onClick={() => move(1)}><Icon name="right"/></button>
    </div></div>
    <ul className="shelf-row" ref={row} data-focus-row onFocus={event => {
      const cards = Array.from(row.current?.querySelectorAll('.app-card') ?? []);
      setIndex(cards.indexOf(event.target));
      event.target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches || document.querySelector('[data-reduce-motion="true"]') ? 'instant' : 'smooth' });
    }}>{entries.map(entry => <ContentPoster key={entry.id} entry={entry} onSelect={onSelect} />)}</ul>
  </section>;
}
