// SPDX-License-Identifier: GPL-3.0-only
import { build } from 'esbuild';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const manifest=resolve(process.argv[2]??resolve(root,'apps/hello-world/app.json'));
const app=JSON.parse(await readFile(manifest,'utf8'));
const entry=resolve(dirname(manifest),app.entry);
await mkdir(resolve(root,'build'),{recursive:true});
await build({entryPoints:[entry],outfile:resolve(root,'build/app.js'),bundle:true,jsx:'automatic',format:'iife',platform:'neutral',target:'es2020',minify:false,legalComments:'inline',define:{'process.env.NODE_ENV':'"production"'},alias:{'@ps4-react/core':resolve(root,'packages/core/index.mjs')},logLevel:'warning'});
console.log(`Bundled ${app.name} with React/reconciler into build/app.js`);
