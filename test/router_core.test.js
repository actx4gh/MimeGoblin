import test from "node:test";
import assert from "node:assert/strict";

import {
  sanitizeSubpath,
  sanitizeFileName,
  joinPath,
  compileRegex,
  expandTemplate
} from "../src/router_core.js";

test("sanitizeSubpath removes absolute and dot segments", () => {
  assert.equal(sanitizeSubpath("/a/../b//c"), "a/b/c");
  assert.equal(sanitizeSubpath("..\\..\\x\\y"), "x/y");
});

test("sanitizeFileName strips path and bad chars", () => {
  assert.equal(sanitizeFileName("C:\\tmp\\a<b>.png"), "a_b_.png");
});

test("joinPath joins folder and file", () => {
  assert.equal(joinPath("images", "pic.png"), "images/pic.png");
});

test("compileRegex rejects invalid patterns", () => {
  assert.equal(compileRegex("(", "i"), null);
  assert.ok(compileRegex("\\.(png)$", "i"));
});

test("expandTemplate expands ctx and capture groups", () => {
  const ctx = { host: "example.com", filename: "a.png" };
  const caps = { filename: ["a.png", "a"] };
  assert.equal(expandTemplate("${host}", ctx, caps), "example.com");
  assert.equal(expandTemplate("${filename:1}", ctx, caps), "a");
});
