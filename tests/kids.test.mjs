import { test } from "node:test";
import assert from "node:assert/strict";
import { aptidao, passaParaAdulto, idadeEm, REGRAS_KIDS } from "../js/logica/graduacao.js";
import { somarDias } from "../js/logica/datas.js";

const H = "2026-11-20";
const aulas = (alunoId, n, aPartir) => Array.from({ length: n }, (_, i) => ({ alunoId, data: somarDias(aPartir, i) }));
const kid = (extra) => ({ id: "k", categoria: "kids", status: "ativo", ...extra });

test("regras kids padrão", () => {
  assert.equal(REGRAS_KIDS.aulasPorGrau, 4);   // mínimo de aulas no mês
  assert.equal(REGRAS_KIDS.mesesPorGrau, 1);   // grau kids é mensal
  assert.equal(REGRAS_KIDS.mesesMinFaixa, 6);
  assert.deepEqual(REGRAS_KIDS.idadeMin, { cinza: 4, amarela: 7, laranja: 10, verde: 13 });
});

test("idade em anos completos", () => {
  assert.equal(idadeEm("2019-11-21", H), 6);
  assert.equal(idadeEm("2019-11-20", H), 7);
});

test("grau kids é mensal: 1 mês e 4 aulas", () => {
  const k = kid({ faixa: "branca", graus: 1, nascimento: "2019-01-01", ultimaGraduacao: "2026-10-15", desdeFaixa: "2026-01-01" });
  assert.equal(aptidao(k, aulas("k", 4, "2026-10-20"), H).tipo, "grau");
  assert.equal(aptidao(k, aulas("k", 3, "2026-10-20"), H).faltamAulas, 1);
  const recente = { ...k, ultimaGraduacao: "2026-11-01" };
  assert.equal(aptidao(recente, aulas("k", 8, "2026-11-02"), H).tipo, null);   // ainda não fez 1 mês
});

test("adulto continua por aulas e tempo (30 aulas e 3 meses)", () => {
  const a = { id: "a", categoria: "adulto", status: "ativo", faixa: "azul", graus: 1, ultimaGraduacao: "2026-10-15", desdeFaixa: "2025-01-01" };
  assert.equal(aptidao(a, aulas("a", 30, "2026-10-16"), H).tipo, null);
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

test("comunicação para crianças vai ao responsável", async () => {
  const { gerarDados } = await import("../js/dados-ficticios.js");
  const { publico } = await import("../js/logica/publicos.js");
  const d = gerarDados(H);
  const kidsAtivos = d.alunos.filter(a => a.categoria === "kids" && a.status === "ativo");
  const r = publico("responsaveis", d, H);
  assert.equal(r.length, kidsAtivos.length);
  const k = kidsAtivos[0], item = r.find(x => x.id === k.id);
  assert.equal(item.telefone, k.responsavel.telefone);
  assert.equal(item.vars.primeiro, k.responsavel.nome.split(" ")[0]);
  assert.equal(item.vars.crianca, k.nome.split(" ")[0]);
  assert.match(item.nome, new RegExp(k.responsavel.nome));
  // qualquer público com criança também fala com o responsável
  const todos = publico("ativos", d, H).find(x => x.id === k.id);
  assert.equal(todos.vars.primeiro, k.responsavel.nome.split(" ")[0]);
});

test("aniversário da criança fala com a criança, no telefone do responsável", async () => {
  const { gerarDados } = await import("../js/dados-ficticios.js");
  const { publico } = await import("../js/logica/publicos.js");
  const d = gerarDados(H);
  const k = d.alunos.find(a => a.categoria === "kids" && a.status === "ativo");
  k.nascimento = "2018-11-05";
  const item = publico("aniversariantes", d, H).find(x => x.id === k.id);
  assert.equal(item.vars.primeiro, k.nome.split(" ")[0]);
  assert.equal(item.telefone, k.responsavel.telefone);
  const cobranca = publico("ativos", d, H).find(x => x.id === k.id);
  assert.equal(cobranca.vars.primeiro, k.responsavel.nome.split(" ")[0]);
});

test("contrato de criança sai no nome do responsável", async () => {
  const { gerarDados } = await import("../js/dados-ficticios.js");
  const { varsParaContato } = await import("../js/logica/modelos.js");
  const d = gerarDados(H), k = d.alunos.find(a => a.categoria === "kids");
  const v = varsParaContato(k, d, H);
  assert.equal(v.nome, k.responsavel.nome);
  assert.equal(v.crianca, k.nome.split(" ")[0]);
});
