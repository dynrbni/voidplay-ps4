import { useState } from 'react';
import { Trailer } from '../src/Trailer.tsx';
import type { Draft } from '../shared/catalog.ts';
import { artworkUrl } from '../shared/catalog.ts';
const localArtwork = import.meta.glob('../public/art/*', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
function Image({ url, alt, kind }: { url: string; alt: string; kind: string }) {
  const [failed, setFailed] = useState('');
  if (!artworkUrl.safeParse(url).success || failed === url) return <div className={`preview-placeholder ${kind}`}>Artwork unavailable</div>;
  const source = url.startsWith('/art/') ? localArtwork[`../public${url}`] : url;
  return <img className={kind} src={source} alt={alt} referrerPolicy="no-referrer" onError={() => setFailed(url)}/>;
}
export function Preview({ draft }: { draft: Draft }) {
  return <article className="entry-preview"><div className="preview-hero"><Image url={draft.heroUrl} alt="Hero artwork" kind="preview-backdrop"/><div><p className="overline">{draft.category} · LOCAL PREVIEW</p><h2>{draft.title || 'Untitled entry'}</h2><p>{draft.summary || 'Your short description appears here.'}</p><span className="preview-cta">Download to PS4 · Runtime unverified</span></div></div><div className="preview-about"><Image url={draft.coverUrl} alt="Cover artwork" kind="preview-cover"/><div><h3>About this application</h3><p>{draft.description}</p><dl><dt>Developer / version</dt><dd>{draft.author} / {draft.version}</dd><dt>Compatibility · {draft.compatibility.status}</dt><dd>{draft.compatibility.notes}</dd><dt>License</dt><dd>{draft.license}</dd></dl></div></div>{draft.trailerUrl && <Trailer key={draft.trailerUrl} url={draft.trailerUrl} title={draft.title || 'Entry'}/>}<p className="preview-genres">{draft.genres.join(' · ')}</p>{draft.screenshots.map((shot, index) => <figure key={index}><Image url={shot.url} alt={shot.description} kind="preview-shot"/><figcaption>{shot.description}</figcaption></figure>)}</article>;
}
