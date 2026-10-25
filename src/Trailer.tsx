import { useState } from 'react';
import { youtubeEmbedUrl, youtubeWatchUrl } from '../shared/youtube.ts';

export function Trailer({ url, title }: { url: string; title: string }) {
  const [loaded, setLoaded] = useState(false);
  const embed = youtubeEmbedUrl(url);
  const watch = youtubeWatchUrl(url);
  if (!embed || !watch) return null;
  return <section className="trailer" aria-label={`${title} trailer`}>
    <h2>Trailer</h2>
    {loaded ? <iframe title={`${title} trailer`} src={embed} allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/> : <div className="trailer-placeholder"><p>Load the YouTube player to watch this trailer.</p><button onClick={() => setLoaded(true)}>Load trailer</button></div>}
    <p><a href={watch} target="_blank" rel="noreferrer">Watch on YouTube ↗</a> · Playback depends on the uploader allowing embeds.</p>
  </section>;
}
