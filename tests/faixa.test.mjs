import { test } from "node:test";
import assert from "node:assert/strict";
import { faixaSVG, nomeFaixa, FAIXAS, CORES_FAIXA } from "../js/ui/faixa.js";

const conta = (s, re) => (s.match(re) || []).length;

test("aria-label diz cor e graus", () => {
  assert.match(faixaSVG("roxa", 2), /aria-label="Faixa roxa, 2 graus"/);
  assert.match(faixaSVG("azul", 9), /4 graus/);
  assert.match(faixaSVG("preta", 0), /#c8201b/);
  assert.match(faixaSVG("branca", 1, { mini: true }), /class="belt mini"/);
});

test("uma fita por grau e cor certa", () => {
  assert.equal(conta(faixaSVG("marrom", 3), /width="7" height="36" fill="#ffffff"/g), 3);
  assert.match(faixaSVG("marrom", 0), new RegExp(CORES_FAIXA.marrom));
  assert.equal(conta(faixaSVG("azul", -2), /width="7" height="36"/g), 0);
});

test("nomes e ordem das faixas", () => {
  assert.deepEqual(FAIXAS, ["branca", "azul", "roxa", "marrom", "preta"]);
  assert.equal(nomeFaixa("marrom"), "Marrom");
});
