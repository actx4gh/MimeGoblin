import {
  safeDecodeUri,
  nowIso,
  dateTokens,
  getBaseName,
  getExt,
  mimeFromExt,
  normalizeMime,
  getHostFromUrl,
  sanitizeSegment,
  sanitizeSubpath,
  sanitizeFileName,
  joinPath,
  compileRegex,
  expandTemplate,
} from "./src/router_core.js";

const MENU_SAVE_IMAGE_ROUTED = "cdr_save_image_routed";
const MENU_SAVE_PAGE_SAVEAS_ROUTED = "cdr_save_page_saveas_routed";

async function ensureContextMenus() {
  try {
    await chrome.contextMenus.removeAll();
    chrome.contextMenus.create({
      id: MENU_SAVE_IMAGE_ROUTED,
      title: "Save image (routed)",
      contexts: ["image"],
    });
    chrome.contextMenus.create({
      id: MENU_SAVE_PAGE_SAVEAS_ROUTED,
      title: "Save page (routed)",
      contexts: ["page"],
    });
  } catch {
    // ignore
  }
}

chrome.runtime.onInstalled.addListener(async (details) => {
  await ensureContextMenus();

  if (details && details.reason === "install") {
    try {
      await chrome.runtime.openOptionsPage();
    } catch {
      // ignore
    }
  }
});

chrome.runtime.onStartup.addListener(() => {
  ensureContextMenus();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === MENU_SAVE_IMAGE_ROUTED) {
    if (!info.srcUrl) return;
        const bestName = (() => {
      try {
        const u = new URL(info.srcUrl);
        const base = getBaseName(u.pathname) || "image";
        return sanitizeFileName(base) || "image";
      } catch {
        return "image";
      }
    })();

    chrome.downloads.download({ url: info.srcUrl, filename: bestName, saveAs: false }, () => {
      // ignore
    });
    return;
  }

  if (info.menuItemId === MENU_SAVE_PAGE_SAVEAS_ROUTED) {
    const url = info.pageUrl || (tab && tab.url) || "";
    if (!url) return;

    const host = getHostFromUrl(url);
    const base = sanitizeFileName((tab && tab.title) || "") || sanitizeSegment(host) || "page";
    const filename = base ? base + ".html" : "page.html";

    chrome.downloads.download({ url, saveAs: false, filename }, () => {
      // ignore
    });
  }
});

/* MimeGoblin (MV3)
 * Routes downloads into subfolders based on regex rules.
 */

const STORAGE_KEY_RULES = "rules";
const STORAGE_KEY_SETTINGS = "settings";
const LOG_KEY = "routeLog";

const DEFAULTS = {
  [STORAGE_KEY_RULES]: [],
  [STORAGE_KEY_SETTINGS]: { enabled: true, maxLogEntries: 50 },
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getLatestDownloadItem(id, fallback) {
  try {
    const items = await chrome.downloads.search({ id });
    if (Array.isArray(items) && items[0]) return items[0];
  } catch {
    // ignore
  }
  return fallback;
}


const VALID_MATCH_ON = new Set(["filename", "url", "referrer", "finalUrl", "mime"]);
const VALID_CONFLICT_ACTION = new Set(["uniquify", "overwrite", "prompt"]);

async function getState() {
  const data = await chrome.storage.sync.get(DEFAULTS);
  const rules = Array.isArray(data[STORAGE_KEY_RULES]) ? data[STORAGE_KEY_RULES] : [];
  const settings = data[STORAGE_KEY_SETTINGS] || { enabled: true, maxLogEntries: 50 };
  return { rules, settings };
}

async function appendLog(entry) {
  try {
    const { settings } = await chrome.storage.sync.get(DEFAULTS);
    const maxLogEntries = Math.min(Math.max(Number(settings?.maxLogEntries) || 50, 0), 200);

    const current = await chrome.storage.local.get({ [LOG_KEY]: [] });
    const log = Array.isArray(current[LOG_KEY]) ? current[LOG_KEY] : [];
    log.unshift(entry);
    if (maxLogEntries > 0) log.splice(maxLogEntries);
    await chrome.storage.local.set({ [LOG_KEY]: log });
  } catch {
    // ignore
  }
}

chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
  let didSuggest = false;
  const safeSuggest = (suggestion) => {
    if (didSuggest) return;
    didSuggest = true;
    try {
      suggest(suggestion);
    } catch {
      // ignore
    }
  };

  (async () => {
    const { rules, settings } = await getState();
    if (!settings?.enabled) {
      safeSuggest();
      return;
    }
const latest0 = await getLatestDownloadItem(downloadItem.id, downloadItem);

// Some fields (especially mime) can lag in the event payload.
// Try a short poll so mime-based rules work for URLs without extensions.
let latest = latest0;
for (let i = 0; i < 3 && !(latest && latest.mime); i++) {
  await sleep(60);
  latest = await getLatestDownloadItem(downloadItem.id, latest);
}

const url = safeDecodeUri(latest.url || downloadItem.url);
const finalUrl = safeDecodeUri(latest.finalUrl || downloadItem.finalUrl);
const referrer = safeDecodeUri(latest.referrer || downloadItem.referrer);
const filename = latest.filename || downloadItem.filename || "";
const mimeRaw = latest.mime || downloadItem.mime || "";


    let urlPathBase = "";
    try {
      urlPathBase = getBaseName(new URL(url).pathname);
    } catch {
      urlPathBase = "";
    }

    const baseName = getBaseName(filename) || urlPathBase || "download";
    const ext = getExt(baseName);
    const host = getHostFromUrl(finalUrl || url);

    const started = downloadItem.startTime ? new Date(downloadItem.startTime) : new Date();
    const dt = dateTokens(started);

    const ctx = {
      filename: baseName,
      ext,
      host,
      url,
      finalUrl,
      referrer,
      mime: normalizeMime(mimeRaw) || mimeFromExt(ext) || "",
      date: dt.date,
      yyyy: dt.yyyy,
      mm: dt.mm,
      dd: dt.dd,
    };

    for (const rule of rules) {
      if (!rule || rule.enabled === false) continue;

      const matchOn = VALID_MATCH_ON.has(rule.matchOn) ? rule.matchOn : "filename";
      const pattern = String(rule.pattern || "");
      const flags = String(rule.flags || "i");
      const folderTpl = String(rule.folder || "");
      const renameTpl = String(rule.rename || "");
      const conflictAction = VALID_CONFLICT_ACTION.has(rule.conflictAction)
        ? rule.conflictAction
        : "uniquify";

      const rx = compileRegex(pattern, flags);
      if (!rx) continue;

      const target = String(ctx[matchOn] || "");
      const m = rx.exec(target);
      if (!m) continue;

      const capturesByField = { [matchOn]: m };

      const folderExpanded = expandTemplate(folderTpl, ctx, capturesByField);
      const renameExpanded = renameTpl
        ? expandTemplate(renameTpl, ctx, capturesByField)
        : ctx.filename;

      const folder = sanitizeSubpath(folderExpanded);
      const finalBase = sanitizeFileName(renameExpanded) || sanitizeFileName(ctx.filename) || "download";

      const suggested = joinPath(folder, finalBase);
      if (!suggested) continue;

      const matched = {
        time: nowIso(),
        downloadId: downloadItem.id,
        host: ctx.host,
        ext: ctx.ext,
        mime: ctx.mime,
        ruleId: rule.id || "",
        matchOn,
        pattern,
        target,
        suggested,
        conflictAction,
      };

      safeSuggest({ filename: suggested, conflictAction });
      await appendLog(matched);
      return;
    }

    await appendLog({ time: nowIso(), note: "no_match", downloadId: downloadItem.id, host: ctx.host, ext: ctx.ext, mime: ctx.mime, target: ctx.filename, suggested: "" });
    safeSuggest();
  })().catch(() => {
    safeSuggest();
  });

  // Required when calling suggest() asynchronously.
  return true;
});
