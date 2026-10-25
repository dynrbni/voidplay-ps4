import { test } from 'node:test';
import assert from 'node:assert/strict';
import { youtubeVideoId, youtubeWatchUrl, youtubeEmbedUrl } from './youtube.ts';
import { metadataSchema, workspaceSchema, updateWorkspace, emptyWorkspace } from './catalog.ts';
import { testEntry } from './fixtures.ts';

test('YouTube links normalize video IDs without accepting arbitrary embeds or hosts', () => {
  const id = 'M7lc1UVf-VE';
  for (const url of [`https://www.youtube.com/watch?v=${id}`, `https://youtu.be/${id}?si=tracking`, `https://youtube.com/shorts/${id}`, `https://www.youtube-nocookie.com/embed/${id}`]) {
    assert.equal(youtubeVideoId(url), id);
    assert.equal(youtubeWatchUrl(url), `https://www.youtube.com/watch?v=${id}`);
    assert.equal(youtubeEmbedUrl(url), `https://www.youtube-nocookie.com/embed/${id}?rel=0`);
  }
  for (const url of ['javascript:alert(1)', 'https://youtube.com.evil.example/watch?v=M7lc1UVf-VE', 'https://example.com/embed/M7lc1UVf-VE', 'http://youtube.com/watch?v=M7lc1UVf-VE', 'https://user:pass@youtube.com/watch?v=M7lc1UVf-VE', 'https://youtube.com:444/watch?v=M7lc1UVf-VE', 'https://youtu.be/too-short', 'https://youtube.com/playlist?list=anything']) assert.equal(youtubeVideoId(url), null, url);
});

test('genres and trailers survive publishing while old workspaces remain readable', () => {
  const entry = { ...testEntry(), genres: ['Action', 'Adventure'], trailerUrl: 'https://youtu.be/M7lc1UVf-VE' };
  const published = metadataSchema.parse(entry);
  assert.equal(published.trailerUrl, 'https://www.youtube.com/watch?v=M7lc1UVf-VE');
  assert.deepEqual(published.genres, entry.genres);
  assert.equal(metadataSchema.safeParse({ ...entry, genres: ['Action', 'action'] }).success, false);
  assert.equal(metadataSchema.safeParse({ ...entry, trailerUrl: 'https://example.com/embed' }).success, false);
  const old = JSON.parse(JSON.stringify(updateWorkspace(emptyWorkspace(), 0, testEntry(), 'publish')));
  delete old.records[0].draft.genres; delete old.records[0].published.genres;
  assert.deepEqual(workspaceSchema.parse(old).records[0]?.published?.genres, []);
});
