import type { CatalogEntry } from './catalog.ts';
import type { DemoTransfer, TransferCommand } from './demoTransfers.ts';
import { formatBytes } from './demoTransfers.ts';
import { Artwork } from './ContentPoster.tsx';
import { Icon } from './Icon.tsx';

const labels = { downloading: 'Downloading · Demo', queued: 'Queued', paused: 'Paused', completed: 'Demo complete', cancelled: 'Cancelled' };

export function Downloads({ entries, jobs, onCommand, onClear, onBrowse, onSelect }: {
  entries: CatalogEntry[]; jobs: DemoTransfer[]; onCommand: (id: string, command: TransferCommand) => void; onClear: () => void; onBrowse: () => void; onSelect: (entry: CatalogEntry) => void;
}) {
  const active = jobs.find(job => job.status === 'downloading');
  const pending = jobs.filter(job => ['downloading', 'queued', 'paused'].includes(job.status));
  const finished = jobs.filter(job => job.status === 'completed' || job.status === 'cancelled');
  return <div className="downloads-page"><div className="page-heading"><div><p className="eyebrow">Keep everything in view</p><h1>Downloads</h1></div><p>{pending.length} in queue</p></div>
    <div className="demo-notice"><span className="demo-badge">DEMO</span><p>Simulated transfers for the beta preview. Progress, sizes, speeds, and remaining time are demo values. No files are downloaded or sent to PS4.</p></div>
    {jobs.length ? <>
      <div className="download-summary"><div><span>Demo speed</span><strong>{active ? `${formatBytes(active.bytesPerSecond)}/s` : '—'}</strong></div><div><span>Active</span><strong>{active ? '1 transfer' : 'None'}</strong></div><div><span>Completed demos</span><strong>{jobs.filter(job => job.status === 'completed').length}</strong></div></div>
      <section className="transfer-list" aria-label="Demo downloads"><div className="shelf-heading"><h2>Your queue</h2>{finished.length > 0 && <button className="text-button" onClick={onClear}>Clear finished</button>}</div>
        {jobs.map(job => {
          const entry = entries.find(item => item.id === job.entryId);
          const title = entry?.title ?? 'Unavailable concept';
          const percent = Math.floor(job.receivedBytes / job.totalBytes * 100);
          const seconds = job.bytesPerSecond > 0 ? Math.ceil((job.totalBytes - job.receivedBytes) / job.bytesPerSecond) : null;
          return <article className="transfer-row" key={job.entryId} aria-label={`${title} demo download`}>
            {entry ? <button className="transfer-cover" aria-label={`View ${title} details`} onClick={() => onSelect(entry)}><Artwork entry={entry}/></button> : <div className="transfer-cover missing-transfer-art"><Icon name="download"/></div>}
            <div className="transfer-content"><div className="transfer-heading"><h3>{title}</h3><span className="transfer-status" role="status">{labels[job.status]}</span></div>
              <div className="transfer-progress"><progress max={job.totalBytes} value={job.receivedBytes} aria-label={`${title} demo progress`}/><span>{percent}%</span></div>
              <p className="transfer-metrics"><span>{formatBytes(job.receivedBytes)} / {formatBytes(job.totalBytes)} <span className="metric-label">demo size</span></span>{job.status === 'downloading' && <><span>{formatBytes(job.bytesPerSecond)}/s <span className="metric-label">demo speed</span></span><span>About {seconds}s left</span></>}{job.status === 'completed' && <span>Simulation finished · No file transferred</span>}</p>
            </div><div className="transfer-controls">
              {(job.status === 'downloading' || job.status === 'queued') && <button className="round-button" aria-label={`Pause ${title} demo`} onClick={() => onCommand(job.entryId, 'pause')}><Icon name="pause"/></button>}
              {job.status === 'paused' && <button className="round-button" aria-label={`Resume ${title} demo`} onClick={() => onCommand(job.entryId, 'resume')}><Icon name="play"/></button>}
              {['downloading', 'queued', 'paused'].includes(job.status) && <button className="round-button" aria-label={`Cancel ${title} demo`} onClick={() => onCommand(job.entryId, 'cancel')}><Icon name="close"/></button>}
              {(job.status === 'completed' || job.status === 'cancelled') && <button className="round-button" aria-label={`Retry ${title} demo`} onClick={() => onCommand(job.entryId, 'retry')}><Icon name="retry"/></button>}
            </div>
          </article>;
        })}
      </section></> : <section className="message"><Icon name="download"/><h2>Nothing in the queue.</h2><p>Open a concept and choose Download to PS4 to try the demo download flow.</p><button className="primary" onClick={onBrowse}>Browse applications<Icon name="right"/></button></section>}
    <p className="catalog-note">Demo queues stay in this browser. Unfinished demos restore paused after reload. Library listings and favorites are kept separately.</p>
  </div>;
}
