# Changelog

## 1.1.5
- Options: add support for dragging rules to change ordering
- Add raw mime info to log entries

## 1.1.4
- Options: fix rule 'On' selector resetting after import/add/re-render.
- Save page (routed): no longer forces a Save As dialog.

## 1.1.3
- Fix: MIME-based rules now apply to context-menu image downloads even when the event payload lacks `mime` (polls `downloads.search` briefly).
- Improve: Route Log entries include `mime`, `ext`, `host`, and `downloadId` for debugging.


## 1.1.2
- Packaging fix: release extension zip now contains only runtime extension files (no repo metadata such as .github/).

## 1.1.1
- Normalize MIME type and derive MIME from filename extension when missing (fixes image routing regression for some downloads)

## 1.1.0
- Rebranded to MimeGoblin
- New icon set

## 1.0.6
- Repo hardening: CI, CodeQL workflow, Dependabot for actions
- Pure helper module (`src/router_core.js`) with unit tests
- Release workflow builds and uploads zips
- Added architecture doc and demo gif

## 1.0.5
- Added context menu: Save page as... (routed)

## 1.0.4
- Fixed Add Rule clobber after import

## 1.0.3
- Added context menu: Save image (routed)

## 1.0.1
- Rule reorder UI

## 1.0.0
- Initial GitHub-ready release
