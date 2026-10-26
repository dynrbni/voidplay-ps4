import { access, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createPasswordRecord } from '../server/password.ts';

async function hiddenPassword(): Promise<string> {
  process.stdout.write('Owner password (hidden): ');
  if (!process.stdin.isTTY) {
    let value = '';
    for await (const chunk of process.stdin) value += String(chunk);
    return value.replace(/[\r\n]+$/, '');
  }
  return new Promise((resolve, reject) => {
    let value = '';
    process.stdin.setEncoding('utf8'); process.stdin.setRawMode(true); process.stdin.resume();
    const finish = () => { process.stdin.setRawMode(false); process.stdin.pause(); process.stdin.off('data', read); process.stdout.write('\n'); };
    const read = (chunk: string) => {
      for (const character of chunk) {
        if (character === '\r' || character === '\n') { finish(); resolve(value); return; }
        if (character === '\u0003') { finish(); reject(new Error('Cancelled.')); return; }
        if (character === '\u007f') value = value.slice(0, -1);
        else if (character >= ' ') value += character;
      }
    };
    process.stdin.on('data', read);
  });
}

const directory = fileURLToPath(new URL('../.owner-data/', import.meta.url));
const target = directory + 'credentials.json';
try {
  let exists = true;
  try { await access(target); } catch { exists = false; }
  if (exists) throw new Error('Owner credentials already exist. To rotate, stop the backend and move the old credentials file to a private backup first.');
  const record = await createPasswordRecord(await hiddenPassword());
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await writeFile(target, JSON.stringify(record) + '\n', { flag: 'wx', mode: 0o600 });
  console.log('Owner password configured privately on this Mac. No plaintext password was saved. Start npm run owner:serve.');
} catch (error) { console.error(error instanceof Error ? error.message : 'Owner setup failed.'); process.exitCode = 1; }
