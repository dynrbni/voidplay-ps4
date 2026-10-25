import { useRef } from 'react';
import type { CatalogEntry } from './catalog.ts';
import type { DemoTransfer } from './demoTransfers.ts';
import { Artwork } from './ContentPoster.tsx';
import { ContentShelf } from './ContentShelf.tsx';
import { Icon } from './Icon.tsx';
import { ScreenshotGallery } from './ScreenshotGallery.tsx';
import { FavoriteButton } from './FavoriteButton.tsx';

export function Details({ entry, entries, favorites, tracked, transfer, onClose, onSelect, onFavorite, onTrack, onDownload }: {
  entry: CatalogEntry; entries: CatalogEntry[]; favorites: string[]; tracked: boolean; transfer?: DemoTransfer;
  onClose: () => void; onSelect: (entry: CatalogEntry) => void; onFavorite: (id: string) => void; onTrack: () => void; onDownload: () => void;
}) {
  const about = useRef<HTMLHeadingElement>(null);
  const sameCategory = entries.filter(item => item.id !== entry.id && item.category === entry.category);
  const related = sameCategory.length ? sameCategory : entries.filter(item => item.id !== entry.id);
  const ongoing = transfer && ['downloading', 'queued', 'paused'].includes(transfer.status);
  return <article className="detail-page" aria-labelledby="detail-title">
    <section className="detail-hero"><div className="hero-art"><Artwork entry={entry} source={entry.heroUrl} eager/></div><div className="hero-shade"/>
      <button className="back-button" onClick={onClose}><Icon name="back"/><span>Back</span></button>
      <div className="detail-copy"><p className="eyebrow">{entry.category} · Concept preview</p><h1 id="detail-title">{entry.title}</h1><p className="detail-summary">{entry.summary ?? entry.description}</p><p className="detail-description">{entry.description}</p></div>
      <div className="detail-actions"><div className="hero-actions"><button className="primary download-to-console" aria-describedby="demo-download-note" onClick={onDownload}><Icon name="download"/>{ongoing ? 'View download' : 'Download to PS4'}</button>
        <FavoriteButton title={entry.title} saved={favorites.includes(entry.id)} onToggle={() => onFavorite(entry.id)}/>
        <button className="round-button" aria-label="Application information" title="Application information" onClick={() => { about.current?.focus({ preventScroll: true }); about.current?.scrollIntoView({ block: 'start', behavior: 'instant' }); }}><Icon name="info"/></button>
      </div><p className="hero-disclosure" id="demo-download-note">Demo transfer · No files are sent to a console</p></div>
    </section>
    <div className="detail-body"><div className="detail-information"><section><h2 ref={about} tabIndex={-1}>About this application</h2><p>{entry.description}</p>
      <button className="track-button" aria-pressed={tracked} onClick={onTrack}><Icon name={tracked ? 'check' : 'library'}/>{tracked ? 'In your library' : 'Add to library'}</button>
      <p className="availability-note">Library tracks listings separately from favorites and demo downloads. No application is installed.</p>
      {entry.releaseNotes && <><h2>Release notes</h2><p className="release-notes">{entry.releaseNotes}</p></>}
    </section><section aria-label="Application information"><dl className="item-metadata">
      <div><dt>Category</dt><dd>{entry.category}</dd></div>{entry.author && <div><dt>Author</dt><dd>{entry.author}</dd></div>}{entry.version && <div><dt>Version</dt><dd>{entry.version}</dd></div>}
      <div><dt>Availability</dt><dd>Concept preview</dd></div><div className="metadata-wide"><dt>Compatibility · Unverified</dt><dd>{entry.compatibilityNotes}</dd></div>
      {entry.license && <div className="metadata-wide"><dt>License & redistribution</dt><dd>{entry.license}</dd></div>}
    </dl></section></div>
      {entry.screenshots?.length ? <ScreenshotGallery screenshots={entry.screenshots}/> : null}
      <ContentShelf title={sameCategory.length ? `More in ${entry.category.toLowerCase()}` : 'More to explore'} entries={related} onSelect={onSelect} favorites={favorites} onFavorite={onFavorite} format="landscape"/>
    </div>
  </article>;
}
