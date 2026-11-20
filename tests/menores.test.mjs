import { test } from "node:test";
import assert from "node:assert/strict";
import { criarStore } from "../js/store.js";
import { csv } from "../js/ui/util-admin.js";
import { gerarDados } from "../js/dados-ficticios.js";

const mapa = (o = {}) => ({ getItem: k => (k in o ? o[k] : null), setItem: (k, v) => { o[k] = String(v); } });

test("dados parcialmente quebrados são refeitos", () => {
  const d = gerarDados("2026-11-20"); delete d.checkins;
  const s = criarStore("2026-11-20", mapa({ "gb-admin:v2": JSON.stringify(d) }));
  assert.ok(Array.isArray(s.dados.checkins) && s.dados.checkins.length > 0);
});

test("CSV não vira fórmula no Excel", () => {
  const t = csv([["=HYPERLINK(\"x\")", "+1", "-2", "@a", "ok"]]);
  assert.match(t, /'=HYPERLINK/);
  assert.match(t, /;'\+1;'-2;'@a;ok$/);
});
