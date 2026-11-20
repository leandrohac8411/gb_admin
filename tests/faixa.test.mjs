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

test("faixas kids", async () => {
  const { FAIXAS_KIDS, faixasDe, corBase } = await import("../js/ui/faixa.js");
  assert.equal(FAIXAS_KIDS.length, 13);
  assert.equal(faixasDe("kids").length, 13);
  assert.deepEqual(faixasDe("adulto"), FAIXAS);
  assert.equal(corBase("amarela-preta"), "amarela");
  assert.equal(nomeFaixa("amarela-preta"), "Amarela e preta");
  assert.equal(nomeFaixa("cinza-branca"), "Cinza e branca");
  const s = faixaSVG("laranja-branca", 2);
  assert.match(s, /#ee7d1c/);
  assert.match(s, /height="9" fill="#ffffff"/);
  assert.match(s, /aria-label="Faixa laranja e branca, 2 graus"/);
  assert.match(faixaSVG("verde-preta", 0), /height="9" fill="#111111"/);
});
