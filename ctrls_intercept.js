/*
 * Ctrl+S interceptor for MimeGoblin.
 *
 * Runs only when the user explicitly enables it (optional permissions).
 *
 * Current behavior:
 * - Intercepts Ctrl+S / Cmd+S on direct image tabs (document.contentType starts with "image/")
 * - Prevents Chrome's built-in "Save..." flow
 * - Asks the service worker to download the current URL via chrome.downloads
 */

(function () {
  function isEditableTarget(t) {
    if (!t) return false;
    const tag = (t.tagName || "").toUpperCase();
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
    if (t.isContentEditable) return true;
    return false;
  }

  function isSaveCombo(e) {
    if (!e) return false;
    const key = (e.key || "").toLowerCase();
    if (key !== "s") return false;

    const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
    const primary = isMac ? e.metaKey : e.ctrlKey;

    // Let users keep variants like Ctrl+Shift+S (Chrome Save As) intact.
    if (!primary || e.shiftKey || e.altKey) return false;

    return true;
  }

  function isDirectImageDocument() {
    const t = String(document.contentType || "");
    return t.startsWith("image/");
  }

  window.addEventListener("keydown", (e) => {
    if (!isSaveCombo(e)) return;
    if (isEditableTarget(e.target)) return;
    if (!isDirectImageDocument()) return;

    e.preventDefault();
    e.stopPropagation();

    chrome.runtime.sendMessage({
      type: "cdr_save_current_url",
      url: String(location.href || "")
    });
  }, true);
})();
