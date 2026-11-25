// Portal do aluno: o painel mantém o espelho e junta os check-ins dos alunos. Plano 2026-11-25, tarefa 4.
import { test } from "node:test";
import assert from "node:assert/strict";
import { criarSincroniaPortal } from "../js/logica/portal-sincronia.js";

function cenario({ acessosNoBanco = [], pendentes = [] } = {}) {
  const gravados = [], apagadosCk = [];
  let salvou = 0, n = 0;
  const dados = {
    alunos: [
      { id: "a1", nome: "Ana", categoria: "adulto", status: "ativo", faixa: "azul", graus: 0, ultimaGraduacao: "2026-01-01", desdeFaixa: "2026-01-01", emailPortal: "ana@x.com" },
      { id: "a2", nome: "Bia", categoria: "adulto", status: "ativo", faixa: "branca", graus: 0, ultimaGraduacao: "2026-01-01", desdeFaixa: "2026-01-01" },
      { id: "k1", nome: "Lia", categoria: "kids", status: "ativo", faixa: "branca", graus: 0, emailPortal: "lia@x.com" }
    ],
    professores: [], turmas: [{ id: "t1", diaSemana: 3, horario: "12:30", programa: "GB1", categoria: "adulto" }],
    checkins: [], cronograma: [], config: { ancoras: [] }, modelosAula: []
  };
  const store = { dados, novoId: p => `${p}${++n}`, salvar: () => { salvou++; return true; } };
  const nuvem = {
    gravarEspelho: async (m, colecao) => { gravados.push({ colecao, gravar: m.gravar.map(([id, o]) => [id, o]), apagar: m.apagar }); },
    lerAcessos: async () => acessosNoBanco,
    checkinsPendentes: async () => pendentes,
    apagarCheckinsAluno: async ids => { apagadosCk.push(...ids); }
  };
  const s = criarSincroniaPortal({ store, nuvem, hoje: "2026-11-25" });
  return { s, store, gravados, apagadosCk, salvou: () => salvou };
}
const da = (gravados, colecao) => gravados.filter(g => g.colecao === colecao);

test("aoAbrir grava a grade e o espelho só de quem tem e-mail (e é adulto)", async () => {
  const c = cenario();
  await c.s.aoAbrir();
  assert.deepEqual(da(c.gravados, "portalGrade")[0].gravar.map(([id]) => id), ["atual"]);
  assert.deepEqual(da(c.gravados, "portal")[0].gravar.map(([id]) => id), ["a1"]);
  assert.deepEqual(da(c.gravados, "acessos")[0].gravar, [["ana@x.com", { alunoId: "a1", nome: "Ana", ativo: true }]]);
});

test("salvar de novo sem mudança não grava nada", async () => {
  const c = cenario();
  await c.s.aoAbrir();
  const antes = c.gravados.length;
  await c.s.aposSalvar();
  assert.equal(c.gravados.slice(antes).reduce((t, g) => t + g.gravar.length + g.apagar.length, 0), 0);
});

test("trancar regrava o acesso com ativo false", async () => {
  const c = cenario();
  await c.s.aoAbrir();
  c.store.dados.alunos[0].status = "trancado";
  await c.s.aposSalvar();
  assert.deepEqual(da(c.gravados, "acessos").at(-1).gravar, [["ana@x.com", { alunoId: "a1", nome: "Ana", ativo: false }]]);
});

test("acesso que está no banco mas ninguém mais tem é apagado", async () => {
  const c = cenario({ acessosNoBanco: [{ id: "velho@x.com", alunoId: "zz", nome: "Saiu", ativo: true }] });
  await c.s.aoAbrir();
  assert.deepEqual(da(c.gravados, "acessos")[0].apagar, ["velho@x.com"]);
});

test("check-ins dos alunos viram presença (origem aluno), salvam e são apagados", async () => {
  const c = cenario({ pendentes: [{ id: "a1_t1_2026-11-25", alunoId: "a1", turmaId: "t1", data: "2026-11-25", hora: "12:31" }] });
  await c.s.aoAbrir();
  assert.deepEqual(c.store.dados.checkins.map(x => [x.alunoId, x.origem]), [["a1", "aluno"]]);
  assert.ok(c.salvou() >= 1);
  assert.deepEqual(c.apagadosCk, ["a1_t1_2026-11-25"]);
  assert.equal(da(c.gravados, "portal")[0].gravar[0][1].presencas.length, 1, "o espelho já sai com a presença nova");
});
