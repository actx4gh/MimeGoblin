# Contributing

## Dev

- `npm run check`
- `npm test`
- `npm run build`

To run the extension locally:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the repo folder

## Release

1. Update `manifest.json` version and `CHANGELOG.md`
2. `npm run check && npm test && npm run build`
3. Tag and push: `git tag vX.Y.Z && git push --tags`

The GitHub Actions release workflow will upload:

- `dist/mimegoblin-X.Y.Z.zip`
- `dist/SHA256SUMS.txt`
