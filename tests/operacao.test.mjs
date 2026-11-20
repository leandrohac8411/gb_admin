import { test } from "node:test";
import assert from "node:assert/strict";
import { preencher, varsDoAluno } from "../js/logica/modelos.js";
import { PUBLICOS, publico } from "../js/logica/publicos.js";
import { presencaPorDia, presencaPorHorario, ranking, receitaPorPlano } from "../js/logica/relatorios.js";
import { gerarDados } from "../js/dados-ficticios.js";

const H = "2026-11-20";

test("preencher troca {{campos}} e deixa os desconhecidos visíveis", () => {
  assert.equal(preencher("Oi {{primeiro}}, {{x}}!", { primeiro: "Ana" }), "Oi Ana, {{x}}!");
  assert.equal(preencher("{{ nome }}", { nome: "Ana Lima" }), "Ana Lima");
});

test("variáveis do aluno", () => {
  const d = gerarDados(H), a = d.alunos[3];
  const v = varsDoAluno(a, d, H);
  assert.equal(v.primeiro, a.nome.split(" ")[0]);
  assert.equal(v.academia, "GB Sobradinho");
  assert.equal(v.data, "20/11/2026");
  assert.match(v.valor, /^R\$/);
  assert.ok(Number(v.aulas30) >= 0);
});

test("públicos de mensagem", () => {
  const d = gerarDados(H);
  assert.ok(PUBLICOS.length >= 6);
  assert.equal(publico("ativos", d, H).length, 37);
  assert.equal(publico("atrasados", d, H).length, 4);
  assert.equal(publico("sumidos", d, H).length, 3);
  assert.equal(publico("novos", d, H).length, 2);
  assert.ok(publico("prospects", d, H).every(p => p.telefone));
  assert.deepEqual(publico("nao-existe", d, H), []);
});

test("relatórios de presença", () => {
  const d = gerarDados(H);
  const dias = presencaPorDia(d.checkins, H, 30);
  assert.equal(dias.length, 7);
  assert.equal(dias[0], 0);  // domingo sem aula
  const hor = presencaPorHorario(d.checkins, d.turmas, H, 30);
  assert.ok(hor.find(h => h.horario === "19:00").n > hor.find(h => h.horario === "10:00").n);
  const top = ranking(d.checkins, d.alunos, H, 5);
  assert.equal(top.length, 5);
  assert.ok(top[0].n >= top[4].n);
});

test("receita por plano usa valor mensal equivalente e só ativos", () => {
  const r = receitaPorPlano([{ plano: "Mensal", status: "ativo" }, { plano: "Anual", status: "ativo" }, { plano: "Mensal", status: "trancado" }],
    [{ id: "Mensal", nome: "Mensal", meses: 1, valor: 280 }, { id: "Anual", nome: "Anual", meses: 12, valor: 2700 }]);
  assert.deepEqual(r.map(x => [x.id, x.alunos, x.mensal]), [["Mensal", 1, 280], ["Anual", 1, 225]]);
});
