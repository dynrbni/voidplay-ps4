import type { CatalogEntry } from './catalog.ts';
import { Artwork } from './ContentPoster.tsx';
import { ContentShelf } from './ContentShelf.tsx';
import { Icon } from './Icon.tsx';
import { ScreenshotGallery } from './ScreenshotGallery.tsx';

export function Details({ entry, entries, favorite, tracked, onClose, onSelect, onFavorite, onTrack }: {
  entry: CatalogEntry; entries: CatalogEntry[]; favorite: boolean; tracked: boolean;
  onClose: () => void; onSelect: (entry: CatalogEntry) => void; onFavorite: () => void; onTrack: () => void;
}) {
  const sameCategory = entries.filter(item => item.id !== entry.id && item.category === entry.category);
  const related = sameCategory.length ? sameCategory : entries.filter(item => item.id !== entry.id);
  return <article className="detail-page" aria-labelledby="detail-title">
    <section className="detail-hero">
      <div className="hero-art"><Artwork entry={entry} source={entry.heroUrl} eager/></div><div className="hero-shade"/>
      <button className="back-button" onClick={onClose}><Icon name="back"/>Back</button>
      <div className="detail-identity"><div className="detail-cover"><Artwork entry={entry} eager/></div>
        <div className="detail-copy"><p className="eyebrow">{entry.category}<span aria-hidden="true"> / </span>Concept preview</p>
          <h1 id="detail-title">{entry.title}</h1><p className="detail-summary">{entry.summary ?? entry.description}</p>
          <div className="hero-actions"><button className="primary" aria-pressed={tracked} onClick={onTrack}><Icon name={tracked ? 'check' : 'plus'}/>{tracked ? 'In your library' : 'Add to library'}</button>
            <button className="secondary" aria-pressed={favorite} onClick={onFavorite}><Icon name={favorite ? 'check' : 'heart'}/>{favorite ? 'In favorites' : 'Add to favorites'}</button></div>
          <p className="hero-disclosure">Preview listing · No downloadable package</p>
        </div>
      </div>
    </section>
    <div className="detail-body"><div className="detail-information"><section><h2>About this application</h2><p>{entry.description}</p>
      <p className="availability-note"><Icon name="info"/>This is a fictional catalog concept. Adding it to your library tracks the listing; it does not download or install an application.</p>
      {entry.releaseNotes && <><h2>Release notes</h2><p className="release-notes">{entry.releaseNotes}</p></>}
    </section><section aria-label="Application information"><dl className="item-metadata">
      <div><dt>Category</dt><dd>{entry.category}</dd></div>
      {entry.author && <div><dt>Author</dt><dd>{entry.author}</dd></div>}
      {entry.version && <div><dt>Version</dt><dd>{entry.version}</dd></div>}
      <div><dt>Availability</dt><dd>Concept preview</dd></div>
      <div className="metadata-wide"><dt>Compatibility · Unverified</dt><dd>{entry.compatibilityNotes}</dd></div>
      {entry.license && <div className="metadata-wide"><dt>License & redistribution</dt><dd>{entry.license}</dd></div>}
    </dl></section></div>
      {entry.screenshots?.length ? <ScreenshotGallery screenshots={entry.screenshots}/> : null}
      <ContentShelf title={sameCategory.length ? `More in ${entry.category.toLowerCase()}` : 'More to explore'} entries={related} onSelect={onSelect} format="landscape"/>
    </div>
  </article>;
}
