const STORAGE_KEY_SETTINGS = "settings";
const DEFAULT_SETTINGS = { enabled: true, maxLogEntries: 50 };

function setStatus(msg) {
  const el = document.getElementById("status");
  el.textContent = msg || "";
}

async function load() {
  const { [STORAGE_KEY_SETTINGS]: settings = DEFAULT_SETTINGS } =
    await chrome.storage.sync.get({ [STORAGE_KEY_SETTINGS]: DEFAULT_SETTINGS });

  const enabled = document.getElementById("enabled");
  enabled.checked = !!settings.enabled;

  enabled.addEventListener("change", async () => {
    const next = { ...settings, enabled: enabled.checked };
    await chrome.storage.sync.set({ [STORAGE_KEY_SETTINGS]: next });
    setStatus(enabled.checked ? "Routing enabled" : "Routing disabled");
  });

  document.getElementById("openOptions").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
}

load().catch((e) => {
  setStatus("Error");
  console.error(e);
});
