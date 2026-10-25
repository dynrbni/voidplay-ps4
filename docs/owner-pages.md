# Owner catalog: GitHub Pages + this Mac

The public application is at `https://dynrbni.github.io/voidplay-ps4/`, the owner
front door at `/admin/`, and the public manifest at `/catalog.json`. A pushed
branch is not proof the site is live; see the deployment evidence below.

GitHub Pages hosts static files. Its admin shell is public source, while the
private workspace and every write/publish action require authentication on the
loopback Mac backend. The owner chose local hosting for development. This is
not a cloud backend: the Mac must be running and the browser must be on that
Mac. Other visitors cannot use their localhost to reach your workspace.

## Start editing

1. In this repository run `npm run owner:serve`. It builds the admin and serves
   it at **http://127.0.0.1:5186/**. Keep that process running.
2. Open the local URL, or the Pages `/admin/` front door. Sign in with the owner
   password configured privately on this Mac; no username is needed. Browsers
   may ask to allow the Pages site to reach the local network. If a browser
   blocks HTTPS-to-loopback requests, use the local URL directly.
   The Pages front door provides **Open studio on this Mac** for that case.
3. Enter a permanent slug such as `my-homebrew` under **New entry ID**, then
   choose **Create**. Add title, category, genres, developer, release/version,
   descriptions, cover/hero image URLs and optional screenshots. Image URLs
   must be public HTTPS, or `/art/` assets actually committed to the site.
4. Add an optional YouTube watch/share/Shorts URL. **Preview entry → Load
   trailer** loads a normalized `youtube-nocookie.com` embed only on request.
   There is a YouTube fallback link if the uploader disables embedding. No
   video is downloaded; native PS4 playback has not been implemented.
5. Add one, two or three download sources. Each has its own provider, URL,
   expected size in bytes, SHA-256 and access requirements. Removing/readding
   a source keeps IDs unique. Add languages, compatibility notes/evidence,
   changelog, license and the redistribution permission statement.
6. **Save draft** stores private edits on this Mac. **Validate** checks required
   publication metadata. **Stage published snapshot** freezes the validated
   version; later saved draft edits do not leak into that snapshot.
7. **Publish to Pages** commits only the exported public catalog to `gh-pages`
   through this Mac's authenticated `gh` CLI. It does not merge source PRs or
   expose GitHub credentials. **Check deployment** confirms whether the public
   JSON has reached the submitted revision. Reload the application afterward.
8. **Unpublish**, then **Publish to Pages**, removes an entry from the public
   catalog. Back up the private workspace before moving Macs or changing setup.

The catalog starts in real mode with no entries. No real game's download URL,
checksum or redistribution permission was supplied, so no listing was invented.
Fictional concepts remain test fixtures only and are removed from Pages output.
The browser application loads the published JSON for Discover, Browse/search
and item detail pages. The C++ PS4 runtime remains a separate startup/display
PoC; it does not yet load this catalog or play YouTube videos.

## Password and persistence

The requested password is already configured on this development Mac. No
plaintext password is stored. `.owner-data/credentials.json` contains a salted
scrypt verifier, with mode 0600 in a private directory; Git ignores that entire
directory. First setup on another Mac is interactive:

```sh
npm run owner:setup
npm run owner:serve
```

Never commit `.owner-data/`, passwords, workspace backups or GitHub tokens.
`workspace.json` and `publication.json` remain private server files. Sessions
are random, expire after one hour, and stay only in browser/server memory;
reload requires sign-in. Logout revokes the session. Five failed attempts are
limited for 15 minutes. The backend binds only to 127.0.0.1, validates Host and
Origin, checks bearer authorization on all private endpoints and rejects stale
workspace/publication revisions. Writes use an exclusive lock and atomic rename.

If an interrupted operation leaves `.owner-data/workspace.lock`, first stop the
backend and inspect/back up the workspace. Remove only that stale lock after
confirming no owner backend is running. Never replace a corrupt workspace with
an empty one automatically. Import a validated backup through the editor.
To rotate the password, stop the backend, move its credentials file to a private
backup, run setup again and restart; old sessions then disappear.

For a package file you own, obtain actual size/checksum locally:

```sh
stat -f%z /absolute/path/to/authorized.pkg
shasum -a 256 /absolute/path/to/authorized.pkg
```

The server never fetches arbitrary download URLs to guess checksums. Completing
or opening a download does not install anything on PS4.

## Pages maintenance

```sh
npm run pages:build   # verified static output, no network publication
npm run pages:deploy  # build and publish development assets to gh-pages
```

`pages:deploy` checks the exact origin repository, creates a normal descendant
commit on `gh-pages`, pushes without force, and configures Pages to serve that
branch. Redeploys preserve its existing public catalog, including entries added
after the source branch was built. Do not edit the public manifest in the source
branch to reset production. `Publish to Pages` changes only catalog.json and
uses the file SHA to reject concurrent changes.

This local publishing path replaces the earlier manual Actions Pages workflow,
which could overwrite live metadata with a stale source catalog. It does not
change the PR merge policy or disable CI. GitHub's Pages build still must finish;
account/Pages restrictions can block deployment even after a successful push.
The live result is recorded in `docs/verification.md` after an actual HTTP check.
