import { useEffect, useRef } from 'react';
import type { CatalogEntry } from './catalog.ts';

export function Details({ entry, onClose }: { entry: CatalogEntry; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
  }, []);

  function close() {
    dialog.current?.close();
    onClose();
  }

  return (
    <dialog ref={dialog} onCancel={event => { event.preventDefault(); close(); }} aria-labelledby="detail-title" aria-describedby="detail-description">
      <div className="dialog-top"><span className="eyebrow">Mock application</span>
        <button onClick={close} autoFocus>Close details</button></div>
      <p className="category">{entry.category}</p>
      <h2 id="detail-title">{entry.title}</h2>
      <p id="detail-description">{entry.description}</p>
      <dl>
        <div><dt>Compatibility</dt><dd>{entry.compatibilityNotes}</dd></div>
        <div><dt>Package metadata</dt><dd>No release, size, checksum, or license has been registered.</dd></div>
        <div><dt>Availability</dt><dd>Preview only. Downloads and installation are unavailable.</dd></div>
      </dl>
    </dialog>
  );
}
