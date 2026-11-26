import { test } from "node:test";
import assert from "node:assert/strict";
import { aptidao, aulasDesde, REGRAS, planoDaFaixa } from "../js/logica/graduacao.js";
import { resumoFinanceiro, statusMensalidade } from "../js/logica/financeiro.js";
import { resumoDashboard } from "../js/logica/indicadores.js";
import { gerarDados } from "../js/dados-ficticios.js";
import { somarDias } from "../js/logica/datas.js";

const aulas = (alunoId, n, aPartir) => Array.from({ length: n }, (_, i) => ({ alunoId, turmaId: "t", data: somarDias(aPartir, i), hora: "19:00" }));

test("regras padrão: tempo de cada faixa, 2 treinos por semana e 15% de folga", () => {
  assert.deepEqual(REGRAS.mesesFaixa, { branca: 12, azul: 24, roxa: 12, marrom: 12 });
  assert.equal(REGRAS.treinosPorSemana, 2);
  assert.equal(REGRAS.folgaPct, 15);
});

test("plano da faixa azul: 24 meses, ~177 aulas, graus espaçados (o 4º bem antes da troca)", () => {
  const p = planoDaFaixa("azul");
  assert.equal(p.aulasFaixa, 177, "104 semanas x 2 treinos x 85%");
  assert.equal(p.aulasPorGrau, 35);
  assert.deepEqual(p.graus.map(g => g.dias), [146, 292, 438, 584], "graus a cada ~4,8 meses");
  assert.equal(p.diasFaixa, 730);
  assert.equal(planoDaFaixa("roxa").aulasFaixa, 89, "roxa: 1 ano");
  assert.deepEqual(planoDaFaixa("roxa").graus.map(g => g.dias), [73, 146, 219, 292], "4º grau ~2,4 meses antes da marrom");
  assert.equal(planoDaFaixa("preta"), null);
});

test("conta só aulas depois da data", () => {
  assert.equal(aulasDesde("a", "2026-07-02", [...aulas("a", 5, "2026-06-30"), ...aulas("b", 9, "2026-08-01")]), 2);
});

test("azul: grau quando chega a data prevista E fez as aulas proporcionais desde a faixa", () => {
  const al = { id: "a", faixa: "azul", graus: 0, ultimaGraduacao: "2026-01-01", desdeFaixa: "2026-01-01", status: "ativo" };
  // 1º grau: 146 dias depois (27/05/2026) e 36 aulas (1/5 de 177, arredondado para cima).
  const r1 = aptidao(al, aulas("a", 36, "2026-01-02"), "2026-05-27");
  assert.equal(r1.tipo, "grau"); assert.equal(r1.dataPrevista, "2026-05-27");
  const cedo = aptidao(al, aulas("a", 60, "2026-01-02"), "2026-05-20");
  assert.equal(cedo.tipo, null, "treinou muito, mas ainda não chegou o tempo"); assert.equal(cedo.diasFaltam, 7); assert.equal(cedo.faltamAulas, 0);
  const poucas = aptidao(al, aulas("a", 30, "2026-01-02"), "2026-06-30");
  assert.equal(poucas.tipo, null, "chegou o tempo, mas faltam aulas"); assert.equal(poucas.faltamAulas, 6);
});

test("4º grau na azul, troca para roxa aos 24 meses com ~177 aulas", () => {
  const al = { id: "a", faixa: "azul", graus: 4, ultimaGraduacao: "2027-08-10", desdeFaixa: "2026-11-01", status: "ativo" };
  const r = aptidao(al, aulas("a", 177, "2026-11-02"), "2028-11-01");
  assert.equal(r.tipo, "faixa"); assert.equal(r.proximaFaixa, "roxa");
  assert.equal(aptidao(al, aulas("a", 177, "2026-11-02"), "2028-10-01").tipo, null, "um mês antes ainda não");
  assert.deepEqual(r.trocaFaixa, { data: "2028-10-31", dias: 0 });
});

test("troca de faixa prevista aparece desde o começo da faixa (para o portal)", () => {
  const al = { id: "a", faixa: "roxa", graus: 1, ultimaGraduacao: "2026-03-01", desdeFaixa: "2026-01-01", status: "ativo" };
  const r = aptidao(al, [], "2026-06-01");
  assert.equal(r.trocaFaixa.data, "2027-01-01");
  assert.equal(r.trocaFaixa.dias, 214);
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
  assert.equal(r.ativos, 54);
  assert.equal(r.presencaSemanas.length, 8);
  assert.ok(r.aulasHoje.length === 2 && r.aulasHoje.every(t => t.diaSemana === 5));
  assert.equal(r.inadimplentes, 4);
  assert.ok(r.checkinsMes > 0 && r.recebidoMes > 0);
  assert.ok(r.aptos > 0, "a vitrine precisa ter alguém apto a graduar");
  assert.ok(r.aniversariantes.every(a => a.nascimento.slice(5, 7) === "11"));
});

import { progressoGraduacao } from "../js/logica/graduacao.js";
test("progresso do próximo passo: adulto conta desde a faixa; kids desde a última graduação", () => {
  const al = { id: "a", faixa: "azul", graus: 0, ultimaGraduacao: "2026-01-01", desdeFaixa: "2026-01-01", status: "ativo" };
  const ap = aptidao(al, aulas("a", 20, "2026-01-02"), "2026-03-01");
  assert.deepEqual(progressoGraduacao(al, ap), { feitas: 20, necessarias: 36 });
  const k = { id: "k", categoria: "kids", faixa: "cinza", graus: 1, ultimaGraduacao: "2026-10-20", desdeFaixa: "2026-01-01", status: "ativo", nascimento: "2018-01-01" };
  const apk = aptidao(k, aulas("k", 2, "2026-10-21"), "2026-11-10");
  assert.deepEqual(progressoGraduacao(k, apk), { feitas: 2, necessarias: 4 });
});
