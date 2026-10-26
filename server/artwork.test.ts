import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pageImage, publicAddress, resolveArtwork } from './artwork.ts';

test('artwork pages yield safe image metadata without executing page content', () => {
  assert.equal(pageImage('<meta content="/cover.png?a=1&amp;b=2" property="og:image">', 'https://example.com/game'), 'https://example.com/cover.png?a=1&b=2');
  assert.equal(pageImage("<meta name='twitter:image' content='//images.example.com/a.webp'>", 'https://example.com/'), 'https://images.example.com/a.webp');
  for (const value of ['javascript:alert(1)', 'https://127.0.0.1/private', 'https://example.com/?token=secret']) assert.equal(pageImage(`<meta property="og:image" content="${value}">`, 'https://example.com'), undefined);
  assert.equal(pageImage('<script>fetch("https://example.com")</script>', 'https://example.com'), undefined);
});
test('artwork resolution excludes loopback, private, mapped and reserved networks', async () => {
  for (const address of ['127.0.0.1', '0.0.0.0', '10.2.3.4', '172.16.0.1', '192.168.1.1', '100.64.0.1', '169.254.1.2', '239.0.0.1', '::1', '::', '::ffff:127.0.0.1', 'fd00::1', 'fe80::1']) assert.equal(publicAddress(address), false, address);
  for (const address of ['1.1.1.1', '8.8.8.8', '2606:4700:4700::1111']) assert.equal(publicAddress(address), true, address);
  await assert.rejects(resolveArtwork('https://127.0.0.1/private'));
  await assert.rejects(resolveArtwork('https://example.com:8443/image.png'), /443/);
});
