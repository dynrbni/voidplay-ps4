import { mkdir, readFile, rename, open, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { emptyWorkspace, workspaceSchema } from '../shared/catalog.ts';
import type { Workspace } from '../shared/catalog.ts';

export async function writePrivateJson(directory: string, name: string, value: unknown): Promise<void> {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const temporary = join(directory, `.${name}-${randomUUID()}`);
  const file = await open(temporary, 'wx', 0o600);
  try { await file.writeFile(JSON.stringify(value, null, 2) + '\n'); await file.sync(); }
  finally { await file.close(); }
  await rename(temporary, join(directory, name));
}

export async function withWorkspaceLock<T>(directory: string, action: () => Promise<T>): Promise<T> {
  const path = join(directory, 'workspace.lock');
  const lock = await open(path, 'wx', 0o600);
  try { return await action(); }
  finally { await lock.close(); await unlink(path); }
}

export async function loadWorkspace(directory: string): Promise<Workspace> {
  try { return workspaceSchema.parse(JSON.parse(await readFile(join(directory, 'workspace.json'), 'utf8'))); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new Error('Private workspace is unreadable. Restore a validated backup; existing data was not overwritten.', { cause: error });
    const workspace = emptyWorkspace();
    await writePrivateJson(directory, 'workspace.json', workspace);
    return workspace;
  }
}
