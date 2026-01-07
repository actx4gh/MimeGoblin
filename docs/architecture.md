# Architecture

This extension has three parts:

- **Service worker** (`service_worker.js`)
  - Hooks `chrome.downloads.onDeterminingFilename`
  - Applies rules in order (first match wins)
  - Suggests a relative path under the user's Downloads directory
  - Writes a small routing log to `chrome.storage.local`

- **Options UI** (`options.html` + `options.js`)
  - CRUD for rules
  - Import/export JSON
  - Rule ordering

- **Popup UI** (`popup.html` + `popup.js`)
  - Quick enable/disable
  - Link to Options

## Matching model

Each rule selects a field:

- `filename`, `url`, `finalUrl`, `referrer`, `mime`

The selected field is tested against the rule regex. If it matches:

- `folder` and `rename` templates are expanded
- the expanded values are sanitized
- the worker calls `suggest({ filename, conflictAction })`

## Path rules

Chrome extensions can only suggest a path relative to the Downloads directory. The worker sanitizes:

- leading slashes
- `.` / `..` segments
- backslashes
- control characters
- characters that are rejected by Windows filenames

## Why the worker is a module

The service worker runs as an ES module (`background.type = module`) so it can import pure helpers from `src/router_core.js`.
