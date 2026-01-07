const STORAGE_KEY_RULES = "rules";
const STORAGE_KEY_SETTINGS = "settings";
const LOG_KEY = "routeLog";

const DEFAULTS = {
  [STORAGE_KEY_RULES]: [],
  [STORAGE_KEY_SETTINGS]: { enabled: true, maxLogEntries: 50 },
};

const MATCH_ON = ["filename", "url", "referrer", "finalUrl", "mime"];
const CONFLICT_ACTION = ["uniquify", "overwrite", "prompt"];

// Options page state.
// Important: imports can replace the stored rules array. Event handlers must
// operate on the current list, not a stale array captured at page load.
let currentRules = [];
let currentSettings = { enabled: true, maxLogEntries: 50 };

function uid() {
  return "r_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function compileRegex(pattern, flags) {
  const f = (flags || "i").replace(/[^gimsuy]/g, "") || "i";
  try { return new RegExp(pattern, f); } catch { return null; }
}

function downloadJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  let pendingValue = null;
  let pendingChecked = null;

  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined) continue;
    if (k === "class") e.className = v;
    else if (k === "text") e.textContent = v;
    else if (k === "value") pendingValue = v;
    else if (k === "checked") pendingChecked = !!v;
    else if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }

  for (const c of children) e.append(c);

  // For <select>, setting .value before options exist does not stick.
  if (pendingValue !== null) e.value = pendingValue;
  if (pendingChecked !== null) e.checked = pendingChecked;

  return e;
}

async function getState() {
  const data = await chrome.storage.sync.get(DEFAULTS);
  return {
    rules: Array.isArray(data[STORAGE_KEY_RULES]) ? data[STORAGE_KEY_RULES] : [],
    settings: data[STORAGE_KEY_SETTINGS] || { enabled: true, maxLogEntries: 50 },
  };
}

async function setRules(rules) {
  await chrome.storage.sync.set({ [STORAGE_KEY_RULES]: rules });
}

async function setSettings(settings) {
  await chrome.storage.sync.set({ [STORAGE_KEY_SETTINGS]: settings });
}

function ruleRow(rules, rule) {
  const rowIndex = rules.findIndex(r => r.id === rule.id);

  const rx = rule.pattern ? compileRegex(rule.pattern, rule.flags || "i") : null;
  const bad = rule.pattern && !rx;

  const selMatch = el("select", { value: rule.matchOn || "filename" },
    ...MATCH_ON.map(v => el("option", { value: v, text: v }))
  );

  const inpPattern = el("input", { type: "text", value: rule.pattern || "", class: bad ? "bad" : "" });
  const inpFlags = el("input", { type: "text", value: rule.flags || "i" });
  const inpFolder = el("input", { type: "text", value: rule.folder || "" });
  const inpRename = el("input", { type: "text", value: rule.rename || "" });

  const selConflict = el("select", { value: rule.conflictAction || "uniquify" },
    ...CONFLICT_ACTION.map(v => el("option", { value: v, text: v }))
  );

  const chkEnabled = el("input", { type: "checkbox" });
  chkEnabled.checked = rule.enabled !== false;

  const upBtn = el("button", { class: "iconBtn", type: "button", text: "Up", title: "Move rule up" });
  const downBtn = el("button", { class: "iconBtn", type: "button", text: "Down", title: "Move rule down" });
  const delBtn = el("button", { class: "iconBtn", type: "button", text: "Delete" });

  upBtn.disabled = rowIndex <= 0;
  downBtn.disabled = rowIndex < 0 || rowIndex >= rules.length - 1;

  const errNode = el("small", { class: "error", text: "Invalid regex" });
  errNode.style.display = bad ? "block" : "none";

  function updateRuleFromUI() {
    rule.matchOn = selMatch.value;
    rule.pattern = inpPattern.value;
    rule.flags = inpFlags.value;
    rule.folder = inpFolder.value;
    rule.rename = inpRename.value;
    rule.conflictAction = selConflict.value;
    rule.enabled = chkEnabled.checked;

    const testRx = rule.pattern ? compileRegex(rule.pattern, rule.flags || "i") : null;
    const isBad = !!(rule.pattern && !testRx);
    inpPattern.classList.toggle("bad", isBad);
    errNode.style.display = isBad ? "block" : "none";
  }

  async function persist() {
    updateRuleFromUI();
    await setRules(rules);
  }

  for (const node of [selMatch, inpPattern, inpFlags, inpFolder, inpRename, selConflict, chkEnabled]) {
    node.addEventListener("change", persist);
    node.addEventListener("input", persist);
  }

  delBtn.addEventListener("click", async () => {
    const idx = rules.findIndex(r => r.id === rule.id);
    if (idx >= 0) rules.splice(idx, 1);
    await setRules(rules);
    renderRules(rules);
  });

  async function move(delta) {
    updateRuleFromUI();
    const idx = rules.findIndex(r => r.id === rule.id);
    const to = idx + delta;
    if (idx < 0 || to < 0 || to >= rules.length) return;

    const tableWrap = document.querySelector(".tableWrap");
    const scrollTop = tableWrap ? tableWrap.scrollTop : 0;

    const tmp = rules[to];
    rules[to] = rules[idx];
    rules[idx] = tmp;

    await setRules(rules);
    renderRules(rules);

    const tableWrapAfter = document.querySelector(".tableWrap");
    if (tableWrapAfter) tableWrapAfter.scrollTop = scrollTop;
  }

  upBtn.addEventListener("click", () => move(-1));
  downBtn.addEventListener("click", () => move(1));

  const actions = el("div", { class: "actions" }, upBtn, downBtn, delBtn);

  return el("tr", {},
    el("td", {}, selMatch),
    el("td", {}, inpPattern, errNode),
    el("td", {}, inpFlags),
    el("td", {}, inpFolder),
    el("td", {}, inpRename),
    el("td", {}, selConflict),
    el("td", {}, chkEnabled),
    el("td", {}, actions),
  );
}

function renderRules(rules) {
  currentRules = rules;
  const tbody = document.getElementById("rulesBody");
  tbody.textContent = "";
  for (const rule of rules) {
    tbody.append(ruleRow(rules, rule));
  }
}

function renderLog(log) {
  const root = document.getElementById("log");
  root.textContent = "";
  if (!Array.isArray(log) || log.length === 0) {
    root.append(el("div", { class: "muted", text: "No entries yet. Download something to see routing decisions here." }));
    return;
  }

  for (const item of log) {
    root.append(el("div", { class: "logItem" },
      el("div", {}, el("span", { class: "k", text: "time: " }), el("span", { text: item.time || "" })),
      item.matchOn ? el("div", {}, el("span", { class: "k", text: "match: " }), el("span", { text: `${item.matchOn} / ${item.pattern}` })) : el("div", {}, el("span", { class: "k", text: "match: " }), el("span", { text: "(none)" })),
      item.target ? el("div", {}, el("span", { class: "k", text: "target: " }), el("span", { text: item.target })) : document.createTextNode(""),
      item.suggested ? el("div", {}, el("span", { class: "k", text: "suggested: " }), el("span", { text: item.suggested })) : document.createTextNode(""),
      item.note ? el("div", {}, el("span", { class: "k", text: "note: " }), el("span", { text: item.note })) : document.createTextNode("")
    ));
  }
}

async function load() {
  const initial = await getState();
  currentRules = initial.rules;
  currentSettings = initial.settings;

  const globalEnabled = document.getElementById("globalEnabled");
  globalEnabled.checked = currentSettings.enabled !== false;
  globalEnabled.addEventListener("change", async () => {
    currentSettings.enabled = globalEnabled.checked;
    await setSettings(currentSettings);
  });

  const maxLogEntries = document.getElementById("maxLogEntries");
  maxLogEntries.value = String(currentSettings.maxLogEntries ?? 50);
  maxLogEntries.addEventListener("change", async () => {
    const v = Number(maxLogEntries.value);
    currentSettings.maxLogEntries = Number.isFinite(v) ? Math.min(Math.max(v, 0), 200) : 50;
    await setSettings(currentSettings);
  });

  document.getElementById("addRule").addEventListener("click", async () => {
    currentRules.push({
      id: uid(),
      enabled: true,
      matchOn: "filename",
      pattern: "",
      flags: "i",
      folder: "",
      rename: "",
      conflictAction: "uniquify",
    });
    await setRules(currentRules);
    renderRules(currentRules);
  });

  document.getElementById("exportRules").addEventListener("click", async () => {
    const state = await getState();
    downloadJson("mimegoblin-rules.json", state);
  });

  document.getElementById("importRules").addEventListener("click", () => {
    document.getElementById("importFile").click();
  });

  document.getElementById("importFile").addEventListener("change", async (ev) => {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === "object") {
        if (Array.isArray(parsed[STORAGE_KEY_RULES])) {
          await chrome.storage.sync.set({ [STORAGE_KEY_RULES]: parsed[STORAGE_KEY_RULES] });
        }
        if (parsed[STORAGE_KEY_SETTINGS] && typeof parsed[STORAGE_KEY_SETTINGS] === "object") {
          await chrome.storage.sync.set({ [STORAGE_KEY_SETTINGS]: parsed[STORAGE_KEY_SETTINGS] });
        }
        const state = await getState();
        currentRules = state.rules;
        currentSettings = state.settings;

        // Refresh top-level controls in case settings were imported.
        globalEnabled.checked = currentSettings.enabled !== false;
        maxLogEntries.value = String(currentSettings.maxLogEntries ?? 50);

        renderRules(currentRules);
      }
    } catch {
      alert("Import failed: invalid JSON.");
    }
  });

  document.getElementById("clearLog").addEventListener("click", async () => {
    await chrome.storage.local.set({ [LOG_KEY]: [] });
    renderLog([]);
  });

  renderRules(currentRules);

  const data = await chrome.storage.local.get({ [LOG_KEY]: [] });
  renderLog(data[LOG_KEY]);

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes[LOG_KEY]) {
      renderLog(changes[LOG_KEY].newValue || []);
    }
  });
}

document.addEventListener("DOMContentLoaded", load);
