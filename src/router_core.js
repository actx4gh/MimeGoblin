// Pure helpers used by the service worker. No chrome.* here.

export function safeDecodeUri(s) {
  if (typeof s !== "string") return "";
  try {
    return decodeURI(s);
  } catch {
    return s;
  }
}

export function nowIso() {
  return new Date().toISOString();
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

export function dateTokens(d) {
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  return { yyyy: String(yyyy), mm, dd, date: `${yyyy}-${mm}-${dd}` };
}

export function getBaseName(path) {
  if (typeof path !== "string" || !path) return "";
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] || "";
}

export function getExt(baseName) {
  const m = /\.([A-Za-z0-9]+)$/.exec(baseName);
  return m ? m[1] : "";
}

export function normalizeMime(mime) {
  if (typeof mime !== "string") return "";
  const main = mime.split(";")[0] || "";
  return main.trim().toLowerCase();
}

export function mimeFromExt(ext) {
  const e = String(ext || "").trim().toLowerCase();
  if (!e) return "";
  switch (e) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    default:
      return "";
  }
}

export function getHostFromUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname || "";
  } catch {
    return "";
  }
}

export function sanitizeSegment(seg) {
  // Remove control chars.
  let s = String(seg).replace(/[\u0000-\u001F\u007F]/g, "");
  // Replace characters that are problematic across platforms.
  s = s.replace(/[<>:\"|?*]/g, "_");
  // Trim and strip trailing dots/spaces (Windows quirks).
  s = s.trim().replace(/[. ]+$/g, "");
  return s;
}

/**
 * Sanitizes a subpath so it's always safe and relative.
 * - no leading slashes
 * - no empty segments
 * - no "." or ".."
 * - converts backslashes to slashes
 */
export function sanitizeSubpath(input) {
  if (typeof input !== "string") return "";
  let p = input.replace(/\\/g, "/").trim();
  p = p.replace(/^\/+/, "");

  const segments = p
    .split("/")
    .map(sanitizeSegment)
    .filter(Boolean)
    .filter((seg) => seg !== "." && seg !== "..");

  return segments.join("/");
}

export function sanitizeFileName(input) {
  if (typeof input !== "string") return "";
  let s = input.replace(/\\/g, "/");
  s = getBaseName(s);
  s = sanitizeSegment(s);
  return s;
}

export function joinPath(folder, file) {
  const f = sanitizeSubpath(folder);
  const b = sanitizeFileName(file);
  if (!f) return b;
  if (!b) return f;
  return `${f}/${b}`;
}

export function compileRegex(pattern, flags) {
  if (typeof pattern !== "string" || !pattern) return null;
  const f = typeof flags === "string" ? flags : "i";
  const safeFlags = f.replace(/[^gimsuy]/g, "") || "i";
  try {
    return new RegExp(pattern, safeFlags);
  } catch {
    return null;
  }
}

export function expandTemplate(template, ctx, capturesByField) {
  if (typeof template !== "string" || !template) return "";
  return template.replace(/\$\{([a-zA-Z]+)(?::(\d+))?\}/g, (m, key, idxStr) => {
    const k = String(key);
    const idx = idxStr ? Number(idxStr) : null;

    if (idx != null) {
      const cap = capturesByField?.[k];
      if (cap && Number.isFinite(idx) && idx >= 0 && idx < cap.length) {
        return cap[idx] ?? "";
      }
      return "";
    }

    return ctx[k] != null ? String(ctx[k]) : "";
  });
}
