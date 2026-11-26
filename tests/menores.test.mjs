import { test } from "node:test";
import assert from "node:assert/strict";
import { criarStore } from "../js/store.js";
import { csv } from "../js/ui/util-admin.js";
import { gerarDados } from "../js/dados-ficticios.js";

const mapa = (o = {}) => ({ getItem: k => (k in o ? o[k] : null), setItem: (k, v) => { o[k] = String(v); } });

test("dados parcialmente quebrados são refeitos", () => {
  const d = gerarDados("2026-11-20"); delete d.checkins;
  const s = criarStore("2026-11-20", mapa({ "gb-admin:v8": JSON.stringify(d) }));
  assert.ok(Array.isArray(s.dados.checkins) && s.dados.checkins.length > 0);
});

test("CSV não vira fórmula no Excel", () => {
  const t = csv([["=HYPERLINK(\"x\")", "+1", "-2", "@a", "ok"]]);
  assert.match(t, /'=HYPERLINK/);
  assert.match(t, /;'\+1;'-2;'@a;ok$/);
});

test("regras vêm das configurações (tempo da faixa, treinos por semana e folga)", async () => {
  const { aptidao, aplicarRegras, REGRAS, planoDaFaixa } = await import("../js/logica/graduacao.js");
  const al = { id: "a", faixa: "azul", graus: 0, ultimaGraduacao: "2026-01-01", desdeFaixa: "2026-01-01", status: "ativo" };
  const aulas = Array.from({ length: 30 }, (_, i) => ({ alunoId: "a", data: `2026-02-${String(i % 28 + 1).padStart(2, "0")}` }));
  assert.equal(aptidao(al, aulas, "2026-04-15").tipo, null, "azul 24 meses: 1º grau só aos ~4,8 meses");
  aplicarRegras({ mesesFaixa: { azul: 12 }, treinosPorSemana: 2, folgaPct: 15 });
  assert.equal(planoDaFaixa("azul").diasFaixa, 365);
  assert.equal(aptidao(al, aulas, "2026-04-15").tipo, "grau", "azul 12 meses: 1º grau aos ~2,4 meses com 18 aulas");
  aplicarRegras({ mesesFaixa: { branca: 12, azul: 24, roxa: 12, marrom: 12 }, treinosPorSemana: 2, folgaPct: 15 });
  assert.equal(REGRAS.mesesFaixa.azul, 24);
});

test("academia de exemplo tem as coleções novas", () => {
  const d = gerarDados("2026-11-20");
  for (const c of ["planos", "produtos", "prospects", "modelosAula", "habilidades", "modelosDoc", "modelosMsg", "perfis", "usuarios", "contratos", "cronograma"]) assert.ok(d[c].length > 0, c);
  assert.equal(d.contratos.length, d.alunos.length);
  assert.equal(d.cronograma.length, 32);
  assert.deepEqual(d.config.regras.mesesFaixa, { branca: 12, azul: 24, roxa: 12, marrom: 12 });
});

test("configuração antiga (aulas e meses por grau) não quebra: fica o padrão novo", async () => {
  const { aplicarRegras, REGRAS } = await import("../js/logica/graduacao.js");
  aplicarRegras({ aulasPorGrau: 30, mesesPorGrau: 0, mesesMinFaixa: {} });
  assert.deepEqual(REGRAS.mesesFaixa, { branca: 12, azul: 24, roxa: 12, marrom: 12 });
  aplicarRegras({ treinosPorSemana: "", folgaPct: 0 });
  assert.equal(REGRAS.treinosPorSemana, 2);
  assert.equal(REGRAS.folgaPct, 0, "zero de folga vale");
  aplicarRegras({ folgaPct: 15 });
});
