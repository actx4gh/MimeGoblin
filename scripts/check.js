import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

const manifestPath = path.join(ROOT, "manifest.json");
const m = readJson(manifestPath);

if (m.manifest_version !== 3) fail("manifest.json: manifest_version must be 3");

const bg = m.background || {};
if (bg.service_worker !== "service_worker.js") {
  fail("manifest.json: background.service_worker must be service_worker.js");
}
if (bg.type !== "module") {
  fail("manifest.json: background.type must be module");
}

if (m.host_permissions && m.host_permissions.length) {
  fail("manifest.json: host_permissions must be empty");
}

const allowedPermissions = new Set(["downloads", "storage", "contextMenus"]);
const perms = Array.isArray(m.permissions) ? m.permissions : [];
for (const p of perms) {
  if (!allowedPermissions.has(p)) fail(`manifest.json: unexpected permission: ${p}`);
}

// Scan only extension runtime JS.
const banned = ["eval(", "new Function("];
const ignoreDirs = new Set([".github", "scripts", "test", "dist", "docs"]);

const files = walk(ROOT)
  .filter((p) => p.endsWith(".js"))
  .filter((p) => {
    const rel = path.relative(ROOT, p);
    const first = rel.split(path.sep)[0];
    return !ignoreDirs.has(first);
  });

for (const f of files) {
  const txt = fs.readFileSync(f, "utf8");
  for (const needle of banned) {
    if (txt.includes(needle)) {
      fail(`banned token found: ${needle} in ${path.relative(ROOT, f)}`);
    }
  }
}

console.log("check: ok");
