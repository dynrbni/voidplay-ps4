import { spawn } from 'node:child_process';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { z } from 'zod';
import { manifestSchema } from '../shared/catalog.ts';
import { deploymentBranch, ghJson, repository, storeUrl } from '../server/github.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'pages-dist');

async function command(binary: string, args: string[], input?: string | Buffer): Promise<string> {
  return new Promise((accept, reject) => {
    const process = spawn(binary, args, { cwd: root, stdio: ['pipe', 'pipe', 'pipe'] });
    let result = ''; let error = '';
    process.stdout.on('data', chunk => { result += String(chunk); });
    process.stderr.on('data', chunk => { error += String(chunk); });
    process.on('error', reject);
    process.on('close', code => code === 0 ? accept(result.trim()) : reject(new Error(`${binary} failed: ${error || result}`)));
    process.stdin.end(input);
  });
}

async function files(directory: string): Promise<string[]> {
  const result: string[] = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isDirectory()) result.push(...await files(path));
    else if (item.isFile()) result.push(path);
    else throw new Error('Pages output cannot contain symlinks or special files.');
  }
  return result;
}

export async function buildPages(): Promise<void> {
  console.log('Building store and password-gated admin shell…');
  await command('npm', ['run', 'build']);
  await command('npm', ['run', 'admin:build']);
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  await cp(join(root, 'dist'), output, { recursive: true });
  await cp(join(root, 'admin-dist'), join(output, 'admin'), { recursive: true });
  await rm(join(output, 'catalog.mock.json'), { force: true });
  await writeFile(join(output, '.nojekyll'), '');
  await writeFile(join(output, 'admin/owner-config.json'), JSON.stringify({ apiBase: 'http://127.0.0.1:5186' }) + '\n');
  const manifest = manifestSchema.parse(JSON.parse(await readFile(join(output, 'catalog.json'), 'utf8')));
  if (manifest.previewMode) throw new Error('Production Pages catalog must use real mode.');
  for (const file of await files(output)) {
    const relative = file.slice(output.length + 1);
    if (/(?:^|\/)(?:server|\.owner-data|node_modules|workspace|credentials)(?:\/|\.)|\.pkg$/.test(relative)) throw new Error(`Private file in Pages output: ${relative}`);
    if (/\.(?:js|json|html|css)$/.test(file)) {
      const text = await readFile(file, 'utf8');
      if (/gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|BEGIN [A-Z ]*PRIVATE KEY|voidplay\.owner-workspace/.test(text)) throw new Error('Private/credential markers in Pages output.');
    }
  }
  console.log('Pages output verified: public catalog/store and admin shell. No private workspace or server included.');
}

async function tree(directory: string): Promise<string> {
  const entries: string[] = [];
  for (const item of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    if (item.isDirectory()) entries.push(`040000 tree ${await tree(join(directory, item.name))}\t${item.name}`);
    else entries.push(`100644 blob ${await command('git', ['hash-object', '-w', '--stdin'], await readFile(join(directory, item.name)))}\t${item.name}`);
  }
  return command('git', ['mktree'], entries.join('\n') + '\n');
}

export async function deployPages(): Promise<void> {
  await buildPages();
  const remote = await command('git', ['remote', 'get-url', 'origin']);
  if (!/^(?:https:\/\/github\.com\/|git@github\.com:)dynrbni\/voidplay-ps4(?:\.git)?$/.test(remote)) throw new Error('Unexpected origin; refusing publication.');
  const reference = `refs/heads/${deploymentBranch}`;
  const previous = (await command('git', ['ls-remote', 'origin', reference])).split(/\s/)[0];
  if (previous) {
    await command('git', ['fetch', 'origin', deploymentBranch]);
    const catalog = manifestSchema.parse(JSON.parse(await command('git', ['show', `${previous}:catalog.json`])));
    if (catalog.previewMode) throw new Error('Existing deployment has an unexpected mock catalog. Review it before publishing.');
    // Asset redeploys must not replace metadata published later by the owner backend.
    await writeFile(join(output, 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
  }
  const source = await command('git', ['rev-parse', 'HEAD']);
  const commit = await command('git', ['commit-tree', await tree(output), ...(previous ? ['-p', previous] : []), '-m', `build(pages): publish store and owner studio from ${source.slice(0, 12)}`]);
  await command('git', ['push', 'origin', `${commit}:${reference}`]);
  console.log(`Deployment branch pushed: ${commit}`);
  await ghJson([`repos/${repository}/pages`, '--method', 'POST'], { build_type: 'legacy', source: { branch: deploymentBranch, path: '/' } }).catch(async error => {
    const existing = z.object({ source: z.object({ branch: z.string(), path: z.string() }) }).safeParse(await ghJson([`repos/${repository}/pages`]));
    if (!existing.success || existing.data.source.branch !== deploymentBranch || existing.data.source.path !== '/') throw error;
  });
  console.log(`Pages configured: ${storeUrl}\nOwner login: ${storeUrl}admin/\nDeployment may still be pending. Check GitHub Pages status before claiming it is live.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const operation = process.argv[2];
  (operation === 'build' ? buildPages() : operation === 'deploy' ? deployPages() : Promise.reject(new Error('Use pages.ts build or deploy.'))).catch(error => { console.error(error instanceof Error ? error.message : 'Pages operation failed.'); process.exitCode = 1; });
}
