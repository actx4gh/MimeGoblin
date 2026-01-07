# MimeGoblin

Routes downloads into subfolders based on regex rules.

![CI](https://github.com/actx4gh/mimegoblin/actions/workflows/ci.yml/badge.svg)
![CodeQL](https://github.com/actx4gh/mimegoblin/actions/workflows/codeql.yml/badge.svg)

## Install (GitHub / unpacked)

Recommended: use the latest release asset.

1. Download `mimegoblin-X.Y.Z.zip` from GitHub Releases.
2. Unzip it.
3. Open `chrome://extensions`.
4. Enable **Developer mode**.
5. Click **Load unpacked** and select the unzipped folder.

Chrome treats unpacked installs as a development flow. Only load code you trust.

### Verify download

Releases include `dist/SHA256SUMS.txt`.

## Quick start

1. Open **Options**.
2. Add a rule.
3. Download something that should match.
4. If it did not route, check **Routing log** in Options.

## Rules

Fields you can match:

- `filename`, `url`, `finalUrl`, `referrer`, `mime`

For images, prefer MIME matching:

- **On:** `mime`
- **Pattern:** `^image/(png|jpe?g|gif|webp)$`
- **Flags:** `i`
- **Folder:** `images`

## Context menu

- **Save image (routed)**: downloads the image and applies routing.
- **Save page as... (routed)**: downloads the page URL as an `.html` file and applies routing.

## Why this repo

This project is meant to be easy to review and hard to misuse.

- MIT license
- no content scripts
- no host permissions
- no remote code
- minimal permissions: `downloads`, `storage`, `contextMenus`
- defensive regex compilation (invalid patterns are skipped)
- defensive path sanitization (no absolute paths, no `..`)
- unit tests for the core helpers
- CI, CodeQL scanning, and Dependabot updates for GitHub Actions
- reproducible zip build (`zip -X` strips extra file attributes)

## Limitations

- Routing can only target subfolders under the Downloads directory.
- Ctrl+S "Save page" is not the same pipeline as normal downloads. Use the routed context menu items.

## Dev

- `npm run check`
- `npm test`
- `npm run build`

See `docs/architecture.md`.
