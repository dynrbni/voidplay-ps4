import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { categories, emptyWorkspace, exportManifest, idSchema, metadataSchema, newDraft, updateWorkspace, validateImport, workspaceSchema } from '../shared/catalog.ts';
import type { Draft, Workspace } from '../shared/catalog.ts';
import { MetadataForm } from './MetadataForm.tsx';
import { Preview } from './Preview.tsx';

const key = 'voidplay.owner-workspace.v1';
function load(): { workspace: Workspace; error: string } {
  try {
    const raw = localStorage.getItem(key);
    if (raw && raw.length > 8_000_000) throw new Error('Workspace is too large.');
    return { workspace: raw ? workspaceSchema.parse(JSON.parse(raw)) : emptyWorkspace(), error: '' };
  } catch { return { workspace: emptyWorkspace(), error: 'Stored workspace is unreadable. Export a recovery copy before saving; existing data has not been replaced.' }; }
}
function download(value: unknown, name: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2) + '\n'], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function errors(error: unknown): string[] {
  return error instanceof z.ZodError ? error.issues.map(issue => `${issue.path.join('.') || 'Catalog'}: ${issue.message}`) : [error instanceof Error ? error.message : 'Operation failed.'];
}
export function Admin() {
  const [initial] = useState(load);
  const [workspace, setWorkspace] = useState(initial.workspace);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [newId, setNewId] = useState('');
  const [messages, setMessages] = useState<string[]>(initial.error ? [initial.error] : []);
  const [notice, setNotice] = useState('');
  const [pendingImport, setPendingImport] = useState<Workspace | null>(null);
  const [preview, setPreview] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [recoveryRequired, setRecoveryRequired] = useState(Boolean(initial.error));
  const validation = useRef<HTMLDivElement>(null);
  useEffect(() => { if (messages.length) validation.current?.focus(); }, [messages]);
  const record = workspace.records.find(item => item.id === draft?.id);
  function persist(next: Workspace) {
    if (recoveryRequired) throw new Error('Export the recovery copy before replacing unreadable browser data.');
    const stored = load();
    if (stored.error || stored.workspace.revision !== workspace.revision || workspace.revision > 0 && JSON.stringify(stored.workspace) !== JSON.stringify(workspace)) throw new Error('Another tab changed the workspace or storage is unreadable. Reload before saving.');
    localStorage.setItem(key, JSON.stringify(next));
    setWorkspace(next);
  }
  function act(action: 'save' | 'publish' | 'unpublish') {
    if (!draft) return;
    try {
      const next = updateWorkspace(workspace, workspace.revision, draft, action);
      persist(next); setMessages([]); setDirty(false);
      setNotice(action === 'publish' ? 'Published snapshot staged locally. Export public JSON and submit it through Git to update the store.' : action === 'unpublish' ? 'Unpublished locally. Export and deploy the new catalog to remove the public entry.' : 'Draft saved. Existing public snapshot is unchanged.');
    } catch (error) { setMessages(errors(error)); setNotice(''); }
  }
  function choose(next: Draft) {
    if (dirty) { setMessages(['Save the open draft before switching entries.']); return; }
    setDraft(structuredClone(next)); setPreview(false); setMessages([]); setNotice('');
  }
  return <div className="studio"><header className="studio-header"><a className="brand" href="#">voidplay.<span>BETA</span></a><span>Catalog Studio</span><span className="local-status">Local owner workspace · Revision {workspace.revision}</span></header>
    <div className="studio-intro"><p className="overline">OWNER TOOLS</p><h1>Catalog administration.</h1><p>Save drafts, inspect every source, then export a public snapshot for Git review. This dashboard does not deploy or hold GitHub credentials.</p></div>
    <div className="workspace-tools"><button onClick={() => download(workspace, `voidplay-workspace-r${workspace.revision}.json`)}>Backup workspace</button><label className="file-button">Import backup<input aria-label="Import backup" type="file" accept="application/json,.json" onChange={async event => {
      const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
      try { if (file.size > 8_000_000) throw new Error('Backup exceeds 8 MB.'); setPendingImport(validateImport(workspace, JSON.parse(await file.text()))); setMessages([]); } catch (error) { setMessages(errors(error)); }
    }}/></label><button className="primary" disabled={dirty} onClick={() => { try { download(exportManifest(workspace), `catalog-r${workspace.revision}.json`); setNotice('Exported public snapshots only. Validate and import the JSON using the documented Git workflow.'); } catch (error) { setMessages(errors(error)); } }}>Export public catalog</button><a href="https://github.com/dynrbni/voidplay-ps4" target="_blank" rel="noreferrer">Git publishing ↗</a></div>
    {recoveryRequired && <button onClick={() => { try { download({ raw: localStorage.getItem(key) }, 'voidplay-recovery.json'); localStorage.removeItem(key); setRecoveryRequired(false); setMessages([]); } catch (error) { setMessages(errors(error)); } }}>Export recovery copy and start empty</button>}
    {pendingImport && <section className="import-review"><h2>Review imported backup</h2><p>Revision {pendingImport.revision}, {pendingImport.records.length} entries. Applying replaces the local workspace; export a backup first.</p><button disabled={dirty} onClick={() => { try { persist(validateImport(workspace, pendingImport)); setPendingImport(null); setDraft(null); setNotice('Backup imported.'); } catch (error) { setMessages(errors(error)); } }}>Apply import</button><button onClick={() => setPendingImport(null)}>Cancel import</button></section>}
    {messages.length > 0 && <div className="validation" role="alert" ref={validation} tabIndex={-1}><h2>Check before continuing</h2><ul>{messages.map((message, index) => <li key={index}>{message}</li>)}</ul></div>}
    {notice && <p className="notice" role="status">{notice}</p>}
    <main className="workspace"><aside aria-label="Catalog entries"><h2>Entries <span>{workspace.records.length}</span></h2><form onSubmit={event => { event.preventDefault(); try { const id = idSchema.parse(newId); if (workspace.records.some(item => item.id === id)) throw new Error('This ID already exists. Choose another.'); if (dirty) throw new Error('Save the open draft before creating another.'); choose(newDraft(id)); setDirty(true); setNewId(''); } catch (error) { setMessages(errors(error)); } }}><label htmlFor="new-id">New entry ID</label><div className="create-row"><input id="new-id" placeholder="my-homebrew" value={newId} onChange={event => setNewId(event.target.value)}/><button type="submit">Create</button></div></form>
      <ul className="entry-list">{workspace.records.map(item => <li key={item.id}><button aria-pressed={draft?.id === item.id} onClick={() => choose(item.draft)}><strong>{item.draft.title || item.id}</strong><span>{item.state} · r{item.revision}{item.publishedRevision !== undefined && item.publishedRevision < item.revision ? ' · draft changes' : ''}</span></button></li>)}</ul><p className="aside-note">Only published snapshots enter the public export. Drafts and unpublished entries stay here.</p></aside>
      <section className="editor" aria-label="Entry editor">{draft ? <><div className="editor-title"><div><p className="overline">{draft.id} · {record?.state ?? 'new draft'}{dirty ? ' · unsaved' : ''}</p><h2>{draft.title || 'Untitled entry'}</h2></div><button aria-pressed={preview} onClick={() => setPreview(!preview)}>{preview ? 'Edit metadata' : 'Preview entry'}</button></div>
        {preview ? <Preview draft={draft}/> : <MetadataForm key={`${draft.id}-${record?.revision ?? 0}`} draft={draft} onChange={next => { setDraft(next); setDirty(true); setNotice(''); }} categories={categories}/>}
        <div className="editor-actions"><button onClick={() => act('save')}>Save draft</button><button onClick={() => { const result = metadataSchema.safeParse(draft); setMessages(result.success ? [] : errors(result.error)); setNotice(result.success ? 'Publication metadata is valid. No changes published.' : ''); }}>Validate</button><button className="primary" onClick={() => act('publish')}>Stage published snapshot</button><button disabled={!record?.published || record.state === 'unpublished'} onClick={() => act('unpublish')}>Unpublish</button>{dirty && record && <button onClick={() => { setDraft(structuredClone(record.draft)); setDirty(false); setMessages([]); }}>Discard unsaved edits</button>}</div>
        <p className="aside-note">Publishing here stages a snapshot on this device. The live store changes only after a validated export is merged and deployed.</p>
      </> : <div className="empty-editor"><p className="overline">START WITH AN ENTRY</p><h2>Create your first entry.</h2><p>Create a unique ID or import a workspace backup. Only content with explicit redistribution permission can be published.</p></div>}</section>
    </main>
  </div>;
}
