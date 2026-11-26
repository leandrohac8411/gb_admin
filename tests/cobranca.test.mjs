import { test } from "node:test";
import assert from "node:assert/strict";
import { cobrancaDoPlano, noCartaoRecorrente, formaPadrao, COBRANCAS } from "../js/logica/cobranca.js";

const planos = [
  { id: "Mensal", valor: 220, meses: 1 },
  { id: "Cartão", valor: 200, meses: 1, cobranca: "cartao" }
];

test("plano sem cobrança definida é manual (planos antigos continuam iguais)", () => {
  assert.equal(cobrancaDoPlano(planos[0]), "manual");
  assert.equal(cobrancaDoPlano(undefined), "manual");
  assert.equal(cobrancaDoPlano({ cobranca: "qualquer" }), "manual");
});

test("plano marcado como cartão recorrente", () => {
  assert.equal(cobrancaDoPlano(planos[1]), "cartao");
  assert.deepEqual(Object.keys(COBRANCAS), ["manual", "cartao"]);
});

test("aluno está no cartão recorrente pelo plano dele", () => {
  assert.equal(noCartaoRecorrente({ plano: "Cartão" }, planos), true);
  assert.equal(noCartaoRecorrente({ plano: "Mensal" }, planos), false);
  assert.equal(noCartaoRecorrente({ plano: "Sumiu" }, planos), false);
});

test("forma sugerida ao dar baixa: cartão recorrente para quem está no cartão", () => {
  assert.equal(formaPadrao({ plano: "Cartão" }, planos), "Cartão recorrente");
  assert.equal(formaPadrao({ plano: "Mensal" }, planos), "Pix");
  assert.equal(formaPadrao(null, planos), "Pix");
});
