import { useEffect, useRef, useState } from 'react';
import type { OwnerApi } from './api.ts';
const localArtwork = import.meta.glob('../public/art/*', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
export function artworkSource(url: string) { return url.startsWith('/art/') ? localArtwork[`../public${url}`] ?? url : url; }
export function ArtworkField({ id, label, value, onChange, resolve }: { id: string; label: string; value: string; onChange: (value: string) => void; resolve: OwnerApi['resolveArtwork'] }) {
  const [failed, setFailed] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  return <div className="artwork-field"><label htmlFor={id}>{label}<input id={id} disabled={busy} value={value} onChange={event => { onChange(event.target.value); setMessage(''); }}/></label>
    {value && <><img key={value} src={artworkSource(value)} alt={`${label} preview`} referrerPolicy="no-referrer" hidden={failed === value} onError={() => setFailed(value)}/>{failed === value && <p>This link did not load an image. If it is a web page, choose Check artwork to find its image.</p>}<button disabled={busy} onClick={() => {
      if (value.startsWith('/art/')) { setMessage('Local artwork must exist in the deployed art folder.'); return; }
      setBusy(true); setMessage('');
      void resolve(value).then(result => { if (!active.current) return; onChange(result.url); setFailed(''); setMessage(result.fromPage ? 'Found the page image and replaced the page URL.' : 'Direct image URL verified.'); }).catch(error => { if (active.current) setMessage(error instanceof Error ? error.message : 'Cannot check artwork.'); }).finally(() => { if (active.current) setBusy(false); });
    }}>{busy ? 'Checking artwork…' : `Check ${label.toLowerCase()}`}</button></>}
    {message && <p role="status">{message}</p>}
  </div>;
}
