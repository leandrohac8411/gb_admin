import { test } from "node:test";
import assert from "node:assert/strict";
import { aptidao, aulasDesde, REGRAS } from "../js/logica/graduacao.js";
import { resumoFinanceiro, statusMensalidade } from "../js/logica/financeiro.js";
import { resumoDashboard } from "../js/logica/indicadores.js";
import { gerarDados } from "../js/dados-ficticios.js";
import { somarDias } from "../js/logica/datas.js";

const aulas = (alunoId, n, aPartir) => Array.from({ length: n }, (_, i) => ({ alunoId, turmaId: "t", data: somarDias(aPartir, i), hora: "19:00" }));

test("regras padrão", () => {
  assert.equal(REGRAS.aulasPorGrau, 30);
  assert.equal(REGRAS.mesesPorGrau, 3);
  assert.deepEqual(REGRAS.mesesMinFaixa, { branca: 12, azul: 24, roxa: 18, marrom: 12 });
});

test("conta só aulas depois da data", () => {
  assert.equal(aulasDesde("a", "2026-07-02", [...aulas("a", 5, "2026-06-30"), ...aulas("b", 9, "2026-08-01")]), 2);
});

test("grau quando bate aulas e tempo", () => {
  const al = { id: "a", faixa: "azul", graus: 1, ultimaGraduacao: "2026-07-01", desdeFaixa: "2025-01-01", status: "ativo" };
  assert.equal(aptidao(al, aulas("a", 30, "2026-07-02"), "2026-11-20").tipo, "grau");
  const r = aptidao(al, aulas("a", 29, "2026-07-02"), "2026-11-20");
  assert.equal(r.tipo, null); assert.equal(r.faltamAulas, 1); assert.equal(r.aulas, 29);
});

test("grau recente não libera mesmo com aulas", () => {
  const al = { id: "a", faixa: "branca", graus: 0, ultimaGraduacao: "2026-10-01", desdeFaixa: "2026-01-01", status: "ativo" };
  assert.equal(aptidao(al, aulas("a", 40, "2026-10-02"), "2026-11-20").tipo, null);
});

test("4 graus sem tempo de faixa não troca faixa", () => {
  const al = { id: "a", faixa: "azul", graus: 4, ultimaGraduacao: "2026-06-01", desdeFaixa: "2025-06-01", status: "ativo" };
  assert.equal(aptidao(al, aulas("a", 40, "2026-06-02"), "2026-11-20").tipo, null);
});

test("4 graus com tempo de faixa vai para a próxima", () => {
  const al = { id: "a", faixa: "roxa", graus: 4, ultimaGraduacao: "2026-06-01", desdeFaixa: "2024-01-01", status: "ativo" };
  const r = aptidao(al, aulas("a", 30, "2026-06-02"), "2026-11-20");
  assert.equal(r.tipo, "faixa"); assert.equal(r.proximaFaixa, "marrom");
});

test("preta e trancado nunca aptos", () => {
  const base = { id: "a", graus: 2, ultimaGraduacao: "2025-01-01", desdeFaixa: "2020-01-01" };
  const muitas = aulas("a", 60, "2025-02-01");
  assert.equal(aptidao({ ...base, faixa: "preta", status: "ativo" }, muitas, "2026-11-20").tipo, null);
  assert.equal(aptidao({ ...base, faixa: "azul", status: "trancado" }, muitas, "2026-11-20").tipo, null);
});

test("status da mensalidade", () => {
  assert.equal(statusMensalidade({ vencimento: "2026-11-10", pagoEm: "2026-11-01" }, "2026-11-20"), "pago");
  assert.equal(statusMensalidade({ vencimento: "2026-11-10", pagoEm: null }, "2026-11-20"), "atrasado");
  assert.equal(statusMensalidade({ vencimento: "2026-11-20", pagoEm: null }, "2026-11-20"), "pendente");
});

test("resumo financeiro", () => {
  const r = resumoFinanceiro([
    { alunoId: "a", competencia: "2026-11", vencimento: "2026-11-10", valor: 280, pagoEm: "2026-11-09" },
    { alunoId: "b", competencia: "2026-11", vencimento: "2026-11-10", valor: 280, pagoEm: null },
    { alunoId: "c", competencia: "2026-11", vencimento: "2026-11-25", valor: 280, pagoEm: null },
    { alunoId: "d", competencia: "2026-11", vencimento: "2026-11-10", valor: 280, pagoEm: null },
    { alunoId: "a", competencia: "2026-10", vencimento: "2026-10-10", valor: 280, pagoEm: null }
  ], [{ id: "a", status: "ativo" }, { id: "b", status: "ativo" }, { id: "c", status: "ativo" }, { id: "d", status: "trancado" }], "2026-11", "2026-11-20");
  assert.deepEqual(r, { previsto: 840, recebido: 280, pendente: 280, atrasado: 280, inadimplentes: ["b"] });
});

test("mês vazio dá zeros", () => {
  assert.deepEqual(resumoFinanceiro([], [], "2026-12", "2026-11-20"), { previsto: 0, recebido: 0, pendente: 0, atrasado: 0, inadimplentes: [] });
});

test("dashboard bate com os dados gerados", () => {
  const d = gerarDados("2026-11-20");
  const r = resumoDashboard(d, "2026-11-20");
  assert.equal(r.ativos, 37);
  assert.equal(r.presencaSemanas.length, 8);
  assert.ok(r.aulasHoje.length === 2 && r.aulasHoje.every(t => t.diaSemana === 5));
  assert.equal(r.inadimplentes, 4);
  assert.ok(r.checkinsMes > 0 && r.recebidoMes > 0);
  assert.ok(r.aptos > 0, "a vitrine precisa ter alguém apto a graduar");
  assert.ok(r.aniversariantes.every(a => a.nascimento.slice(5, 7) === "11"));
});
