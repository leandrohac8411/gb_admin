import { test } from "node:test";
import assert from "node:assert/strict";
import { lerRota } from "../js/rota.js";
import { criarStore } from "../js/store.js";
import { mesesEntre } from "../js/logica/graduacao.js";

const mapa = (o = {}) => ({ getItem: k => (k in o ? o[k] : null), setItem: (k, v) => { o[k] = String(v); } });

test("hash com escape quebrado não lança", () => {
  assert.deepEqual(lerRota("#aluno/%E0"), { rota: "aluno", params: ["%E0"] });
  assert.deepEqual(lerRota(""), { rota: "dashboard", params: [] });
  assert.deepEqual(lerRota("#aluno/a%2001"), { rota: "aluno", params: ["a 01"] });
});

test("dados de exemplo são refeitos quando muda o mês", () => {
  const mem = mapa();
  const s = criarStore("2026-11-20", mem);
  s.dados.alunos[0].nome = "Mexido"; s.salvar();
  assert.equal(criarStore("2026-11-28", mem).dados.alunos[0].nome, "Mexido");
  const dez = criarStore("2026-12-03", mem);
  assert.notEqual(dez.dados.alunos[0].nome, "Mexido");
  assert.ok(dez.dados.mensalidades.some(m => m.competencia === "2026-12"));
});

test("restaurar usa a data do momento", () => {
  const s = criarStore("2026-11-20", mapa());
  s.restaurar("2026-12-05");
  assert.equal(s.dados.geradoEm, "2026-12-05");
});

test("meses de calendário", () => {
  assert.equal(mesesEntre("2025-11-20", "2026-11-20"), 12);
  assert.equal(mesesEntre("2024-11-20", "2026-11-20"), 24);
  assert.equal(mesesEntre("2025-12-01", "2026-03-01"), 3);
  assert.equal(mesesEntre("2026-07-21", "2026-11-20"), 3);
});
