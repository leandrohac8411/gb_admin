import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

test("vercel.json: CSP sem jsDelivr, com Firebase e cabeçalhos de segurança", () => {
  const v = JSON.parse(readFileSync("vercel.json", "utf8"));
  const h = Object.fromEntries(v.headers.find(x => x.source === "/(.*)").headers.map(x => [x.key, x.value]));
  const csp = h["Content-Security-Policy"];
  assert.ok(!csp.includes("jsdelivr"));
  assert.ok(csp.includes("script-src 'self' 'wasm-unsafe-eval' https://www.gstatic.com"));
  assert.ok(csp.includes("https://*.googleapis.com") && csp.includes("frame-ancestors 'none'"));
  assert.equal(h["X-Frame-Options"], "DENY");
  assert.equal(h["X-Content-Type-Options"], "nosniff");
  assert.ok(h["Strict-Transport-Security"].includes("max-age="));
  assert.ok(h["Permissions-Policy"].includes("camera=(self)") && h["Permissions-Policy"].includes("geolocation=()"));
});

test(".vercelignore tira testes, docs e servidor", () => {
  const l = readFileSync(".vercelignore", "utf8").split(/\r?\n/);
  for (const x of ["tests", "docs", "servidor.py", "grade-diario.json"]) assert.ok(l.includes(x), x);
});

test("rostos.js carrega a face-api do próprio site", () => {
  assert.match(readFileSync("js/rostos.js", "utf8"), /const BASE = "\/vendor\/face-api"/);
});

test("modelos de reconhecimento presentes", () => {
  for (const m of ["ssd_mobilenetv1_model-weights_manifest.json", "face_landmark_68_model-weights_manifest.json", "face_recognition_model-weights_manifest.json"])
    assert.ok(existsSync(`vendor/face-api/model/${m}`), m);
});

test("servidor local também sem jsDelivr e servindo vendor/", () => {
  const s = readFileSync("servidor.py", "utf8");
  assert.ok(!s.includes("jsdelivr"));
  assert.ok(s.includes('"vendor/"'));
});
