import { Icon } from './Icon.tsx';

export function Downloads({ onBrowse }: { onBrowse: () => void }) {
  return <div className="secondary-page"><div className="page-heading"><div><p className="eyebrow">Your transfers</p><h1>Downloads.</h1></div><p>No active transfers</p></div>
    <section className="message"><Icon name="download"/><h2>Nothing in the queue.</h2><p>The current collection contains concept listings. No downloadable packages have been registered, so no transfers are available.</p><button className="primary" onClick={onBrowse}>Explore the collection<Icon name="right"/></button></section>
    <p className="catalog-note">Favorites, tracked listings, downloads, and installed applications are separate. Automatic installation is not available.</p>
  </div>;
}

export function Settings({ reduceMotion, onReduceMotion, onReload, count }: {
  reduceMotion: boolean; onReduceMotion: (value: boolean) => void; onReload: () => void; count: number;
}) {
  return <div className="settings-page"><div className="page-heading"><div><p className="eyebrow">Make yourself at home</p><h1>Settings & about.</h1></div></div>
    <div className="settings-content"><section><h2>Appearance</h2><label className="setting-row"><span><strong id="reduce-motion-label">Reduce motion</strong><span>Keep focus movement and image transitions still. Your system preference is also respected.</span></span><input aria-labelledby="reduce-motion-label" type="checkbox" checked={reduceMotion} onChange={event => onReduceMotion(event.target.checked)}/></label></section>
      <section><h2>Your collections</h2><p>Favorites and library listings are stored separately in this browser. There is no account or cloud sync. Clearing browser site data removes them. Library listings do not represent downloaded or installed applications.</p></section>
      <section className="setting-row"><div><h2>Catalog</h2><p>{count} fictional concepts · Local preview data</p><p>Reload the catalog to check the current local fixture.</p></div><button onClick={onReload}>Reload catalog</button></section>
      <section className="about-section"><p className="wordmark">voidplay.</p><h2>A home for homebrew.</h2><p>Voidplay is an independent PS4 homebrew store project. This desktop preview explores the browsing experience with original concept artwork. The current listings are fictional; no executable packages are distributed.</p><p>PS4 runtime, controller input, compatibility, downloads, and installation remain unverified. Keyboard arrows and Tab simulate navigation in the desktop browser.</p><p className="about-credit">Version 0.1.0 · Manrope, self-hosted under the SIL Open Font License</p></section>
    </div>
  </div>;
}
