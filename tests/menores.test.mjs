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

test("regras vêm das configurações", async () => {
  const { aptidao, aplicarRegras, REGRAS } = await import("../js/logica/graduacao.js");
  const al = { id: "a", faixa: "azul", graus: 1, ultimaGraduacao: "2026-07-01", desdeFaixa: "2025-01-01", status: "ativo" };
  const aulas = Array.from({ length: 20 }, (_, i) => ({ alunoId: "a", data: `2026-08-${String(i + 1).padStart(2, "0")}` }));
  assert.equal(aptidao(al, aulas, "2026-11-20").tipo, null);
  aplicarRegras({ aulasPorGrau: 20, mesesPorGrau: 3, mesesMinFaixa: { branca: 12, azul: 24, roxa: 18, marrom: 12 } });
  assert.equal(aptidao(al, aulas, "2026-11-20").tipo, "grau");
  aplicarRegras({ aulasPorGrau: 30, mesesPorGrau: 3, mesesMinFaixa: { branca: 12, azul: 24, roxa: 18, marrom: 12 } });
  assert.equal(REGRAS.aulasPorGrau, 30);
});

test("academia de exemplo tem as coleções novas", () => {
  const d = gerarDados("2026-11-20");
  for (const c of ["planos", "produtos", "prospects", "modelosAula", "habilidades", "modelosDoc", "modelosMsg", "perfis", "usuarios", "contratos", "cronograma"]) assert.ok(d[c].length > 0, c);
  assert.equal(d.contratos.length, d.alunos.length);
  assert.equal(d.cronograma.length, 32);
  assert.equal(d.config.regras.aulasPorGrau, 30);
});

test("regra com zero meses vale", async () => {
  const { aplicarRegras, REGRAS } = await import("../js/logica/graduacao.js");
  aplicarRegras({ aulasPorGrau: 30, mesesPorGrau: 0, mesesMinFaixa: {} });
  assert.equal(REGRAS.mesesPorGrau, 0);
  aplicarRegras({ aulasPorGrau: "", mesesPorGrau: 3 });
  assert.equal(REGRAS.aulasPorGrau, 30);
});
