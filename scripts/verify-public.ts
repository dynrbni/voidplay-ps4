import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { manifestSchema } from '../shared/catalog.ts';
async function inspect(path: string): Promise<void> {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const name = join(path, entry.name);
    if (entry.isDirectory()) { if (/admin|workspace|native|\.git/.test(entry.name)) throw new Error(`Private directory in public output: ${name}`); await inspect(name); }
    else {
      if (/workspace|\.pkg$|\.map$|\.env|^config\.h$/.test(entry.name)) throw new Error(`Unexpected public file: ${name}`);
      if (/\.(js|json|html)$/.test(entry.name)) {
        const data = await readFile(name, 'utf8');
        if (/voidplay\.owner-workspace|Catalog Studio|Stage published snapshot|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}/.test(data)) throw new Error(`Owner UI or credential marker in ${name}`);
      }
    }
  }
}
await inspect('dist');
manifestSchema.parse(JSON.parse(await readFile('dist/catalog.json', 'utf8')));
console.log('Public artifact contains a valid catalog and no admin/workspace/package/credential markers.');
