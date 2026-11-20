import { test } from "node:test";
import assert from "node:assert/strict";
import { aptidao, passaParaAdulto, idadeEm, REGRAS_KIDS } from "../js/logica/graduacao.js";
import { somarDias } from "../js/logica/datas.js";

const H = "2026-11-20";
const aulas = (alunoId, n, aPartir) => Array.from({ length: n }, (_, i) => ({ alunoId, data: somarDias(aPartir, i) }));
const kid = (extra) => ({ id: "k", categoria: "kids", status: "ativo", ...extra });

test("regras kids padrão", () => {
  assert.equal(REGRAS_KIDS.aulasPorGrau, 20);
  assert.equal(REGRAS_KIDS.mesesPorGrau, 2);
  assert.equal(REGRAS_KIDS.mesesMinFaixa, 6);
  assert.deepEqual(REGRAS_KIDS.idadeMin, { cinza: 4, amarela: 7, laranja: 10, verde: 13 });
});

test("idade em anos completos", () => {
  assert.equal(idadeEm("2019-11-21", H), 6);
  assert.equal(idadeEm("2019-11-20", H), 7);
});

test("grau kids com 20 aulas e 2 meses", () => {
  const k = kid({ faixa: "branca", graus: 1, nascimento: "2019-01-01", ultimaGraduacao: "2026-09-01", desdeFaixa: "2026-01-01" });
  assert.equal(aptidao(k, aulas("k", 20, "2026-09-02"), H).tipo, "grau");
  assert.equal(aptidao(k, aulas("k", 19, "2026-09-02"), H).faltamAulas, 1);
});

test("troca de faixa kids depende da idade mínima da próxima cor", () => {
  const base = { faixa: "cinza-preta", graus: 4, ultimaGraduacao: "2026-08-01", desdeFaixa: "2026-04-01" };
  const seis = kid({ ...base, nascimento: "2020-01-01" });
  assert.equal(aptidao(seis, aulas("k", 20, "2026-08-02"), H).tipo, null);
  const sete = kid({ ...base, nascimento: "2019-01-01" });
  const r = aptidao(sete, aulas("k", 20, "2026-08-02"), H);
  assert.equal(r.tipo, "faixa");
  assert.equal(r.proximaFaixa, "amarela-branca");
});

test("pouco tempo na faixa kids não troca", () => {
  const k = kid({ faixa: "amarela", graus: 4, nascimento: "2016-01-01", ultimaGraduacao: "2026-09-01", desdeFaixa: "2026-07-01" });
  assert.equal(aptidao(k, aulas("k", 25, "2026-09-02"), H).tipo, null);
});

test("depois da verde e preta não há faixa kids", () => {
  const k = kid({ faixa: "verde-preta", graus: 4, nascimento: "2011-01-01", ultimaGraduacao: "2026-01-01", desdeFaixa: "2025-01-01" });
  assert.equal(aptidao(k, aulas("k", 40, "2026-02-01"), H).tipo, null);
});

test("16 anos passa para adultos", () => {
  assert.equal(passaParaAdulto(kid({ nascimento: "2010-11-20" }), H), true);
  assert.equal(passaParaAdulto(kid({ nascimento: "2010-11-21" }), H), false);
  assert.equal(passaParaAdulto({ categoria: "adulto", nascimento: "1990-01-01" }, H), false);
});
