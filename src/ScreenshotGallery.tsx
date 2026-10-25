import { useState } from 'react';
import type { CatalogEntry } from './catalog.ts';
import { Icon } from './Icon.tsx';

export function ScreenshotGallery({ screenshots }: { screenshots: NonNullable<CatalogEntry['screenshots']> }) {
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState<string[]>([]);
  const shot = screenshots[active];
  if (!shot) return null;
  return <section className="screenshot-gallery" aria-label="Screenshots"><div className="shelf-heading"><h2>Screenshots</h2><div className="shelf-actions">
    <button className="shelf-arrow" aria-label="Previous screenshot" disabled={active === 0} onClick={() => setActive(value => value - 1)}><Icon name="left"/></button>
    <span aria-live="polite">{active + 1} / {screenshots.length}</span>
    <button className="shelf-arrow" aria-label="Next screenshot" disabled={active === screenshots.length - 1} onClick={() => setActive(value => value + 1)}><Icon name="right"/></button>
  </div></div><figure>{failed.includes(shot.url) ? <div className="art-fallback">Screenshot unavailable</div> : <img src={shot.url} alt={shot.description} loading="lazy" onError={() => setFailed(values => [...values, shot.url])}/>}<figcaption>{shot.description}</figcaption></figure></section>;
}
