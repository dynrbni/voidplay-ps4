import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';
import { request } from 'node:https';
import { httpsUrl } from '../shared/catalog.ts';

const blocked = new BlockList();
for (const [network, prefix] of [['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['224.0.0.0', 4], ['240.0.0.0', 4]] as const) blocked.addSubnet(network, prefix, 'ipv4');
for (const [network, prefix] of [['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8], ['2001:db8::', 32]] as const) blocked.addSubnet(network, prefix, 'ipv6');
export function publicAddress(address: string) {
  const family = isIP(address);
  return Boolean(family) && !address.toLowerCase().startsWith('::ffff:') && !blocked.check(address, family === 4 ? 'ipv4' : 'ipv6');
}
function decode(value: string) {
  return value.replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi, entity => {
    const named: Record<string, string> = { '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>' };
    if (named[entity.toLowerCase()]) return named[entity.toLowerCase()]!;
    const code = entity.toLowerCase().startsWith('&#x') ? parseInt(entity.slice(3, -1), 16) : Number(entity.slice(2, -1));
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
  });
}
export function pageImage(html: string, page: string): string | undefined {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attrs = new Map(Array.from(tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g), match => [match[1]!.toLowerCase(), decode(match[2] ?? match[3] ?? match[4] ?? '')]));
    if (!['og:image', 'og:image:secure_url', 'twitter:image', 'twitter:image:src'].includes((attrs.get('property') ?? attrs.get('name') ?? '').toLowerCase())) continue;
    try { const url = httpsUrl.parse(new URL(attrs.get('content') ?? '', page).href); return url; } catch { /* Ignore invalid page metadata; never execute it. */ }
  }
}

type Resource = { type: 'image'; url: string } | { type: 'html'; url: string; html: string } | { type: 'redirect'; url: string };
async function readResource(value: string, signal: AbortSignal): Promise<Resource> {
  const url = new URL(httpsUrl.parse(value));
  if (url.port && url.port !== '443') throw new Error('Artwork checks only support HTTPS port 443.');
  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(item => !publicAddress(item.address))) throw new Error('Artwork must resolve to a public internet address.');
  const address = addresses.find(item => item.family === 4) ?? addresses[0]!;
  return new Promise((accept, reject) => {
    // Pin the checked DNS result so a second lookup cannot redirect into the local network.
    const outgoing = request(url, { signal, lookup: (_host, options, callback) => {
      if (options.all) callback(null, [address]); else callback(null, address.address, address.family);
    }, headers: { Accept: 'text/html,image/*;q=0.9', 'User-Agent': 'Voidplay-Owner-Studio/0.1' } }, response => {
      const status = response.statusCode ?? 0;
      const type = response.headers['content-type']?.split(';')[0]?.trim().toLowerCase() ?? '';
      if ([301, 302, 303, 307, 308].includes(status) && response.headers.location) {
        response.destroy(); accept({ type: 'redirect', url: new URL(response.headers.location, url).href }); return;
      }
      if (status < 200 || status >= 300) { response.destroy(); reject(new Error(`Artwork host returned HTTP ${status}. Use a direct image URL or another host.`)); return; }
      if (['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/svg+xml'].includes(type)) { response.destroy(); accept({ type: 'image', url: url.href }); return; }
      if (type !== 'text/html' && type !== 'application/xhtml+xml') { response.destroy(); reject(new Error('This URL does not return an image or a supported artwork page.')); return; }
      let html = '';
      response.setEncoding('utf8');
      response.on('data', (chunk: string) => {
        html += chunk;
        if (html.length > 1_000_000) { response.destroy(); reject(new Error('Artwork page is too large. Use a direct image URL.')); }
        else if (/<\/head\s*>/i.test(html)) { response.destroy(); accept({ type: 'html', url: url.href, html }); }
      });
      response.on('end', () => accept({ type: 'html', url: url.href, html }));
      response.on('error', reject);
    });
    outgoing.on('error', reject); outgoing.end();
  });
}
export async function resolveArtwork(value: string): Promise<{ url: string; fromPage: boolean }> {
  const signal = AbortSignal.timeout(12_000);
  let url = value;
  let fromPage = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    const resource = await readResource(url, signal);
    if (resource.type === 'image') return { url: resource.url, fromPage };
    if (resource.type === 'redirect') { url = resource.url; continue; }
    const image = pageImage(resource.html, resource.url);
    if (!image || fromPage) throw new Error('No usable image found on this page. Copy the image address, or leave artwork blank.');
    fromPage = true; url = image;
  }
  throw new Error('Too many artwork redirects. Use a direct image URL.');
}
