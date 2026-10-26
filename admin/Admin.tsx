import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { categories, exportManifest, idSchema, metadataSchema, newDraft, validateImport } from '../shared/catalog.ts';
import type { Draft, Workspace } from '../shared/catalog.ts';
import type { OwnerApi, Publication } from './api.ts';
import { MetadataForm } from './MetadataForm.tsx';
import { Preview } from './Preview.tsx';

function download(value: unknown, name: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2) + '\n'], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function errors(error: unknown): string[] {
  return error instanceof z.ZodError ? error.issues.map(issue => `${issue.path.join('.') || 'Catalog'}: ${issue.message}`) : [error instanceof Error ? error.message : 'Operation failed.'];
}

export function Admin({ initialWorkspace, api, onLogout }: { initialWorkspace: Workspace; api: OwnerApi; onLogout: () => Promise<void> }) {
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [newId, setNewId] = useState('');
  const [messages, setMessages] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [pendingImport, setPendingImport] = useState<Workspace | null>(null);
  const [preview, setPreview] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [publication, setPublication] = useState<Publication | null>(null);
  const validation = useRef<HTMLDivElement>(null);
  useEffect(() => { if (messages.length) validation.current?.focus(); }, [messages]);
  useEffect(() => { let mounted = true; api.publication().then(value => { if (mounted) setPublication(value); }).catch(error => { if (mounted) setMessages(errors(error)); }); return () => { mounted = false; }; }, [api]);
  useEffect(() => {
    let mounted = true;
    async function refresh() {
      if (document.visibilityState === 'hidden' || busy || dirty) return;
      try { const next = await api.load(); if (mounted && next.revision > workspace.revision) { setWorkspace(next); setDraft(current => current ? structuredClone(next.records.find(item => item.id === current.id)?.draft ?? current) : null); setNotice('Workspace refreshed from this Mac.'); } }
      catch (error) { if (mounted) setMessages(errors(error)); }
    }
    window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh);
    return () => { mounted = false; window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [api, busy, dirty, workspace.revision]);
  const record = workspace.records.find(item => item.id === draft?.id);
  async function operation(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setMessages([]); setNotice('');
    try { await action(); } catch (error) { setMessages(errors(error)); }
    finally { setBusy(false); }
  }
  function act(action: 'save' | 'publish' | 'unpublish') {
    if (!draft) return;
    void operation(async () => {
      const next = await api.action(workspace.revision, draft, action);
      setWorkspace(next); setDirty(false);
      setNotice(action === 'publish' ? 'Published snapshot is ready. Choose Publish to Pages to update the application catalog.' : action === 'unpublish' ? 'Entry unpublished in the workspace. Publish to Pages to remove it from the public catalog.' : 'Draft saved privately on this Mac. Existing public snapshot is unchanged.');
    });
  }
  function choose(next: Draft) {
    if (dirty) { setMessages(['Save or discard the open draft before switching entries.']); return; }
    setDraft(structuredClone(next)); setPreview(false); setMessages([]); setNotice('');
  }
  return <div className="studio"><header className="studio-header"><a className="brand" href="#">voidplay.<span>BETA</span></a><span>Catalog Studio</span><span className="local-status">Private Mac workspace · Revision {workspace.revision}</span><button disabled={busy} onClick={() => { if (dirty) setMessages(['Save or discard the open draft before signing out.']); else void operation(onLogout); }}>Sign out</button></header>
    <div className="studio-intro"><p className="overline">OWNER TOOLS</p><h1>Your catalog.</h1><p>Add authorized games and apps, preview the artwork and trailer, then publish a validated catalog to the application.</p></div>
    <div className="workspace-tools"><button disabled={busy} onClick={() => download(workspace, `voidplay-workspace-r${workspace.revision}.json`)}>Backup workspace</button><label className="file-button">Import backup<input disabled={busy} aria-label="Import backup" type="file" accept="application/json,.json" onChange={async event => {
      const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
      try { if (file.size > 8_000_000) throw new Error('Backup exceeds 8 MB.'); setPendingImport(validateImport(workspace, JSON.parse(await file.text()))); setMessages([]); } catch (error) { setMessages(errors(error)); }
    }}/></label><button disabled={dirty || busy} onClick={() => { download(exportManifest(workspace), `catalog-r${workspace.revision}.json`); setNotice('Exported public snapshots only.'); }}>Export public catalog</button><button disabled={dirty || busy || workspace.revision === 0 || publication?.revision === workspace.revision} className="primary" onClick={() => { void operation(async () => { const result = await api.publish(workspace.revision); setPublication(result); setNotice('Catalog committed to the Pages branch. GitHub must finish deployment before it becomes live.'); }); }}>{busy ? 'Working…' : 'Publish to Pages'}</button><button disabled={dirty || busy} onClick={() => { void operation(async () => { setWorkspace(await api.load()); setDraft(null); setNotice('Workspace reloaded from the Mac backend.'); }); }}>Reload workspace</button></div>
    {publication && <div className="publication-status"><button disabled={busy} onClick={() => { void operation(async () => { const result = await api.checkPublication(); setPublication(result); setNotice(result?.state === 'live' ? 'Public catalog is live. Reload the application to fetch it.' : 'Public deployment has not caught up yet. Check GitHub Pages build status.'); }); }}>Check deployment</button><p>Latest submission: revision {publication.revision} · {publication.state === 'live' ? 'live' : 'committed; deployment pending'}</p><a href={publication.storeUrl} target="_blank" rel="noreferrer">Open application ↗</a><a href={publication.catalogUrl} target="_blank" rel="noreferrer">Public catalog JSON ↗</a><a href={`https://github.com/dynrbni/voidplay-ps4/commit/${publication.commit}`} target="_blank" rel="noreferrer">Publication commit ↗</a></div>}
    {pendingImport && <section className="import-review"><h2>Review imported backup</h2><p>Revision {pendingImport.revision}, {pendingImport.records.length} entries. Applying replaces the Mac workspace; export a backup first.</p><button disabled={dirty || busy} onClick={() => { void operation(async () => { setWorkspace(await api.import(workspace.revision, pendingImport)); setPendingImport(null); setDraft(null); setNotice('Backup imported on the Mac backend.'); }); }}>Apply import</button><button onClick={() => setPendingImport(null)}>Cancel import</button></section>}
    {messages.length > 0 && <div className="validation" role="alert" ref={validation} tabIndex={-1}><h2>Check before continuing</h2><ul>{messages.map((message, index) => <li key={index}>{message}</li>)}</ul></div>}
    {notice && <p className="notice" role="status">{notice}</p>}
    <main className="workspace" aria-busy={busy}><aside aria-label="Catalog entries"><h2>Entries <span>{workspace.records.length}</span></h2><form onSubmit={event => { event.preventDefault(); try { const id = idSchema.parse(newId); if (workspace.records.some(item => item.id === id)) throw new Error('This ID already exists. Choose another.'); if (dirty) throw new Error('Save the open draft before creating another.'); choose(newDraft(id)); setDirty(true); setNewId(''); } catch (error) { setMessages(errors(error)); } }}><label htmlFor="new-id">New entry ID</label><div className="create-row"><input id="new-id" disabled={busy} placeholder="my-homebrew" value={newId} onChange={event => setNewId(event.target.value)}/><button disabled={busy} type="submit">Create</button></div></form>
      <ul className="entry-list">{workspace.records.map(item => <li key={item.id}><button disabled={busy} aria-pressed={draft?.id === item.id} onClick={() => choose(item.draft)}><strong>{item.draft.title || item.id}</strong><span>{item.state} · r{item.revision}{item.publishedRevision !== undefined && item.publishedRevision < item.revision ? ' · draft changes' : ''}</span></button></li>)}</ul><p className="aside-note">Drafts stay private. Only staged published snapshots enter the public catalog.</p></aside>
      <section className="editor" aria-label="Entry editor">{draft ? <><div className="editor-title"><div><p className="overline">{draft.id} · {record?.state ?? 'new draft'}{dirty ? ' · unsaved' : ''}</p><h2>{draft.title || 'Entry metadata'}</h2></div><button disabled={busy} aria-pressed={preview} onClick={() => setPreview(!preview)}>{preview ? 'Edit metadata' : 'Preview entry'}</button></div>
        <fieldset disabled={busy} className="editor-content">{preview ? <Preview draft={draft}/> : <MetadataForm key={`${draft.id}-${record?.revision ?? 0}`} draft={draft} onChange={next => { setDraft(next); setDirty(true); setNotice(''); }} categories={categories} resolveArtwork={api.resolveArtwork} onArtworkChange={(id, key, value) => { setDraft(current => current?.id === id ? { ...current, [key]: value } : current); setDirty(true); setNotice(''); }}/>}</fieldset>
        <div className="editor-actions"><button disabled={busy} onClick={() => act('save')}>Save draft</button><button disabled={busy} onClick={() => { const result = metadataSchema.safeParse(draft); setMessages(result.success ? [] : errors(result.error)); setNotice(result.success ? 'Publication metadata is valid. No changes published.' : ''); }}>Validate</button><button disabled={busy} className="primary" onClick={() => act('publish')}>Stage published snapshot</button><button disabled={busy || !record?.published || record.state === 'unpublished'} onClick={() => act('unpublish')}>Unpublish</button>{dirty && <button disabled={busy} onClick={() => { setDraft(record ? structuredClone(record.draft) : null); setDirty(false); setMessages([]); }}>Discard unsaved edits</button>}</div>
        <p className="aside-note">Save draft stores private edits. Stage published snapshot validates a version. Publish to Pages updates public JSON through this Mac’s authenticated GitHub CLI.</p>
      </> : <div className="empty-editor"><p className="overline">REAL CATALOG</p><h2>Create your first entry.</h2><p>Enter a unique ID to add a game or app you are authorized to redistribute. No demo listings are added automatically.</p></div>}</section>
    </main>
  </div>;
}
