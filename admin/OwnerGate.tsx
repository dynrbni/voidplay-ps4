import { useEffect, useState } from 'react';
import { z } from 'zod';
import { Admin } from './Admin.tsx';
import { createOwnerApi } from './api.ts';
import type { OwnerApi } from './api.ts';
import type { Workspace } from '../shared/catalog.ts';

type Session = { api: OwnerApi; workspace: Workspace };
const loginSchema = z.strictObject({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/), expiresAt: z.number() });

function validBase(value: string): string {
  if (value === '') return location.origin;
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/' || url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname))) throw new Error('Invalid owner backend configuration.');
  return url.origin;
}

export function OwnerGate() {
  const [base, setBase] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(new URL('owner-config.json', document.baseURI), { signal: controller.signal, cache: 'no-store' }).then(async response => {
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
        if (['127.0.0.1', 'localhost'].includes(location.hostname)) return { apiBase: 'http://127.0.0.1:5186' };
        throw new Error('Owner backend configuration is missing.');
      }
      return z.strictObject({ apiBase: z.string() }).parse(await response.json());
    }).then(config => setBase(validBase(config.apiBase))).catch(error => { if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : 'Cannot load backend configuration.'); });
    return () => controller.abort();
  }, []);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    if (base === null) return;
    setBusy(true); setMessage('');
    try {
      const response = await fetch(base + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }), credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(10_000) });
      const value: unknown = await response.json();
      if (!response.ok) throw new Error(z.object({ error: z.string() }).safeParse(value).data?.error ?? 'Sign-in failed.');
      const { token } = loginSchema.parse(value);
      const api = createOwnerApi(base, token, () => { setSession(null); setMessage('Session expired. Sign in again. Saved drafts remain on the Mac backend.'); });
      const workspace = await api.load();
      setPassword(''); setSession({ api, workspace });
    } catch (error) { setPassword(''); setMessage(error instanceof TypeError ? 'Cannot reach the Mac backend. Start npm run owner:serve on your Mac. From Pages, allow your browser’s local-network connection if prompted.' : error instanceof Error ? error.message : 'Sign-in failed.'); }
    finally { setBusy(false); }
  }

  if (session) return <Admin initialWorkspace={session.workspace} api={session.api} onLogout={async () => { try { await session.api.logout(); } finally { setSession(null); setPassword(''); } }}/>;
  return <main className="owner-login"><a className="brand" href="#">voidplay.<span>BETA</span></a><p className="overline">OWNER ACCESS</p><h1>Catalog Studio</h1><p>Sign in to manage games and apps. The private workspace stays on your Mac; published catalog data is public.</p>
    <form onSubmit={event => { void login(event); }}><label htmlFor="owner-password">Password<input id="owner-password" type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={event => setPassword(event.target.value)}/></label><button className="primary" disabled={busy || base === null}>{busy ? 'Signing in…' : 'Sign in'}</button></form>
    {message && <p role="alert">{message}</p>}<p className="login-help">Run <code>npm run owner:serve</code> on your Mac before signing in. No username is required. Passwords and session tokens are not saved in browser storage.</p>
  </main>;
}
