import { StorageStatus } from './StorageStatus.tsx';
export function Settings({ reduceMotion, onReduceMotion, onReload, count, previewMode }: {
  reduceMotion: boolean; onReduceMotion: (value: boolean) => void; onReload: () => void; count: number; previewMode: boolean;
}) {
  return <div className="settings-page"><div className="page-heading"><div><p className="eyebrow">Make yourself at home</p><h1>Settings & about.</h1></div></div>
    <div className="settings-content"><section><h2>Appearance</h2><label className="setting-row"><span><strong id="reduce-motion-label">Reduce motion</strong><span>Keep focus movement and image transitions still. Your system preference is also respected.</span></span><input aria-labelledby="reduce-motion-label" type="checkbox" checked={reduceMotion} onChange={event => onReduceMotion(event.target.checked)}/></label></section>
      <section><h2>Your collections</h2><p>Favorites and library listings are stored separately in this browser. There is no account or cloud sync. Clearing browser site data removes them. Library listings do not represent downloaded or installed applications.</p></section>
      <section className="setting-row"><div><h2>Catalog</h2><p>{count} entries · {previewMode ? 'Local concept preview' : 'Published catalog'}</p><p>Reload to check the current catalog revision.</p></div><button onClick={onReload}>Reload catalog</button></section>
      <StorageStatus/><section className="about-section"><p className="wordmark">voidplay.</p><h2>A home for homebrew.</h2><p>Voidplay is an independent PS4 homebrew store project. This desktop preview explores the browsing experience with original concept artwork. Concept preview entries are fictional. Published entries are supplied through a separately validated catalog.</p><p>PS4 runtime, controller input, compatibility, live transfers, and installation remain unverified. The download manager currently simulates demo transfers. Keyboard arrows and Tab simulate navigation in the desktop browser.</p><p className="about-credit">Version 0.1.0 · Manrope, self-hosted under the SIL Open Font License</p></section>
    </div>
  </div>;
}
