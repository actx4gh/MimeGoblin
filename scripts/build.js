import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));
const version = manifest.version;

const distDir = path.join(ROOT, "dist");
fs.mkdirSync(distDir, { recursive: true });

const outZip = path.join(distDir, `mimegoblin-${version}.zip`);
if (fs.existsSync(outZip)) fs.unlinkSync(outZip);

const include = [
  "manifest.json",
  "service_worker.js",
  "options.html",
  "options.js",
  "options.css",
  "popup.html",
  "popup.js",
  "popup.css",
  "icons",
  "src"
];

// Build from a staging dir so the zip has a predictable top-level folder.
// The produced archive root contains: mimegoblin/
const staging = path.join(distDir, `.staging-${version}`);
fs.rmSync(staging, { recursive: true, force: true });
fs.mkdirSync(staging, { recursive: true });

const top = path.join(staging, "mimegoblin");
fs.mkdirSync(top, { recursive: true });

function copyRec(srcRel, dstRel) {
  const src = path.join(ROOT, srcRel);
  const dst = path.join(top, dstRel);
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      copyRec(path.join(srcRel, name), path.join(dstRel, name));
    }
  } else {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
  }
}

for (const item of include) copyRec(item, item);

const zipCmd = "zip";
const args = ["-r", "-X", outZip, "mimegoblin"]; // -X strips extra file attributes
const res = spawnSync(zipCmd, args, { cwd: staging, stdio: "inherit" });
if (res.status !== 0) {
  console.error("build failed: zip command failed");
  process.exit(res.status || 1);
}

fs.rmSync(staging, { recursive: true, force: true });
console.log(`built ${path.relative(ROOT, outZip)}`);
