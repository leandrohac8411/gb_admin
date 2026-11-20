import { test } from "node:test";
import assert from "node:assert/strict";
import { gerarDados } from "../js/dados-ficticios.js";
import { criarStore } from "../js/store.js";
import { normalizar } from "../js/ui/util-admin.js";
import { diaSemana } from "../js/logica/datas.js";

const mapa = (inicial = {}) => {
  const o = { ...inicial };
  return { getItem: k => (k in o ? o[k] : null), setItem: (k, v) => { o[k] = String(v); }, removeItem: k => { delete o[k]; } };
};

test("gera a academia de exemplo", () => {
  const d = gerarDados("2026-11-20");
  assert.equal(d.versao, 1);
  assert.equal(d.alunos.length, 40);
  assert.equal(d.turmas.length, 15);
  assert.equal(d.professores.length, 5);
  assert.equal(d.alunos.filter(a => a.faixa === "preta").length, 2);
  assert.equal(d.alunos.filter(a => a.status === "trancado").length, 3);
  assert.deepEqual(gerarDados("2026-11-20"), d);
  assert.ok(d.checkins.every(c => c.data <= "2026-11-20"));
});

test("check-ins só de ativos e em dia que a turma existe", () => {
  const d = gerarDados("2026-11-20");
  const ativos = new Set(d.alunos.filter(a => a.status === "ativo").map(a => a.id));
  const turmas = Object.fromEntries(d.turmas.map(t => [t.id, t]));
  assert.ok(d.checkins.length > 300);
  assert.ok(d.checkins.every(c => ativos.has(c.alunoId) && diaSemana(c.data) === turmas[c.turmaId].diaSemana));
  const chaves = new Set(d.checkins.map(c => `${c.alunoId}|${c.turmaId}|${c.data}`));
  assert.equal(chaves.size, d.checkins.length);
});

test("mensalidades do mês e alguns atrasados", () => {
  const d = gerarDados("2026-11-20");
  const doMes = d.mensalidades.filter(m => m.competencia === "2026-11");
  assert.ok(doMes.length >= 20);
  const atrasados = new Set(d.mensalidades.filter(m => !m.pagoEm && m.vencimento < "2026-11-20").map(m => m.alunoId));
  assert.equal(atrasados.size, 4);
});

test("histórico de graduações bate com o aluno", () => {
  const d = gerarDados("2026-11-20");
  for (const a of d.alunos) {
    const ult = d.graduacoes.filter(g => g.alunoId === a.id).sort((x, y) => x.data.localeCompare(y.data)).at(-1);
    if (ult) { assert.equal(ult.faixa, a.faixa); assert.equal(ult.graus, a.graus); assert.equal(ult.data, a.ultimaGraduacao); }
    assert.ok(a.desdeFaixa <= a.ultimaGraduacao && a.desde <= a.desdeFaixa);
  }
});

test("store descarta lixo e versão antiga", () => {
  const mem = mapa({ "gb-admin:v1": "{quebrado" });
  assert.equal(criarStore("2026-11-20", mem).dados.alunos.length, 40);
  mem.setItem("gb-admin:v1", JSON.stringify({ versao: 0 }));
  assert.equal(criarStore("2026-11-20", mem).dados.versao, 1);
});

test("store salva, relê e restaura", () => {
  const mem = mapa();
  const s = criarStore("2026-11-20", mem);
  s.dados.alunos[0].nome = "Teste"; s.salvar();
  const s2 = criarStore("2026-11-20", mem);
  assert.equal(s2.dados.alunos[0].nome, "Teste");
  s2.restaurar();
  assert.notEqual(criarStore("2026-11-20", mem).dados.alunos[0].nome, "Teste");
});

test("funciona sem localStorage ou com um que lança", () => {
  assert.equal(criarStore("2026-11-20", undefined).dados.alunos.length, 40);
  const ruim = { getItem() { throw new Error("x"); }, setItem() { throw new Error("x"); } };
  const s = criarStore("2026-11-20", ruim);
  assert.doesNotThrow(() => s.salvar());
});

test("novoId não repete", () => {
  const s = criarStore("2026-11-20", mapa());
  const a = s.novoId("a"), b = s.novoId("a");
  assert.notEqual(a, b);
  assert.ok(!s.dados.alunos.some(x => x.id === a));
});

test("normalizar tira acento e caixa", () => assert.equal(normalizar("João Ávila"), "joao avila"));
