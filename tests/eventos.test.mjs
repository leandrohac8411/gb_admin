import { test } from "node:test";
import assert from "node:assert/strict";
import {
  detalhe, gruposGraduacao, aplicarGraduacoes, categoriaSugerida, MEDALHAS,
  medalhasDoAluno, quadroMedalhas, gruposCampeonato, resumoConfra, temMedalhas
} from "../js/logica/eventos.js";

const HOJE = "2026-11-26";
// Adulto apto a grau: azul desde 2024, último grau há 6 meses, muitas aulas.
const checkinsDe = (id, n) => Array.from({ length: n }, (_, i) => ({ alunoId: id, data: `2026-${String(1 + (i % 10)).padStart(2, "0")}-${String(1 + (i % 27)).padStart(2, "0")}` }));

test("detalhe cria o registro do participante uma vez e devolve o mesmo depois", () => {
  const ev = { inscritos: ["a1"] };
  const x = detalhe(ev, "a1");
  x.medalha = "ouro";
  assert.equal(detalhe(ev, "a1").medalha, "ouro");
  assert.deepEqual(Object.keys(ev.detalhes), ["a1"]);
});

test("graduação: separa troca de faixa, grau e ainda não aptos", () => {
  const kidsFaixa = { id: "k1", categoria: "kids", status: "ativo", faixa: "branca", graus: 4, nascimento: "2018-01-01", desdeFaixa: "2025-01-01", ultimaGraduacao: "2026-09-01" };
  const kidsGrau = { id: "k2", categoria: "kids", status: "ativo", faixa: "cinza", graus: 1, nascimento: "2017-01-01", desdeFaixa: "2026-01-01", ultimaGraduacao: "2026-09-01" };
  const kidsNao = { id: "k3", categoria: "kids", status: "ativo", faixa: "cinza", graus: 1, nascimento: "2017-01-01", desdeFaixa: "2026-01-01", ultimaGraduacao: "2026-11-20" };
  const checkins = [...checkinsDe("k1", 0), ...[1, 2, 3, 4, 5].flatMap(n => [{ alunoId: "k1", data: `2026-10-0${n}` }, { alunoId: "k2", data: `2026-10-0${n}` }])];
  const ev = { tipo: "Graduação", inscritos: ["k1", "k2", "k3", "sumiu"] };
  const g = gruposGraduacao(ev, [kidsFaixa, kidsGrau, kidsNao], checkins, HOJE);
  assert.deepEqual(g.faixa.map(x => x.aluno.id), ["k1"]);
  assert.equal(g.faixa[0].proxima, "cinza-branca");
  assert.deepEqual(g.grau.map(x => x.aluno.id), ["k2"]);
  assert.deepEqual(g.naoAptos.map(x => x.aluno.id), ["k3"]);
});

test("graduação já confirmada fica no grupo de graduados, com o que recebeu", () => {
  const a = { id: "k2", categoria: "kids", status: "ativo", faixa: "cinza", graus: 2, ultimaGraduacao: HOJE };
  const ev = { tipo: "Graduação", inscritos: ["k2"], graduados: [{ alunoId: "k2", faixa: "cinza", graus: 2 }] };
  const g = gruposGraduacao(ev, [a], [], HOJE);
  assert.deepEqual(g.graduados.map(x => x.aluno.id), ["k2"]);
  assert.equal(g.grau.length + g.faixa.length + g.naoAptos.length, 0);
});

test("confirmar graduações muda faixa ou grau, grava o histórico e não aplica duas vezes", () => {
  const a = { id: "a", categoria: "kids", status: "ativo", faixa: "cinza", graus: 1, ultimaGraduacao: "2026-09-01", desdeFaixa: "2026-01-01" };
  const b = { id: "b", categoria: "kids", status: "ativo", faixa: "branca", graus: 4, ultimaGraduacao: "2026-09-01", desdeFaixa: "2025-01-01" };
  const d = { alunos: [a, b], graduacoes: [] };
  const ev = { id: "ev9", tipo: "Graduação", inscritos: ["a", "b"] };
  const n = aplicarGraduacoes(d, ev, [{ id: "a", tipo: "grau" }, { id: "b", tipo: "faixa", proxima: "cinza" }], HOJE);
  assert.equal(n, 2);
  assert.equal(a.graus, 2);
  assert.deepEqual([b.faixa, b.graus, b.desdeFaixa], ["cinza", 0, HOJE]);
  assert.equal(a.ultimaGraduacao, HOJE);
  assert.equal(d.graduacoes.length, 2);
  assert.equal(d.graduacoes[0].eventoId, "ev9");
  assert.equal(aplicarGraduacoes(d, ev, [{ id: "a", tipo: "grau" }], HOJE), 0);
  assert.equal(a.graus, 2);
  assert.equal(ev.graduados.length, 2);
});

test("categoria sugerida pelo cadastro: faixa, idade e peso (adulto) ou faixa e idade (kids)", () => {
  assert.equal(categoriaSugerida({ faixa: "azul", nascimento: "1990-05-01", peso: 75, sexo: "M" }, HOJE), "Azul · Master 2 · Leve");
  assert.equal(categoriaSugerida({ faixa: "azul", nascimento: "2000-05-01" }, HOJE), "Azul · Adulto");
  assert.equal(categoriaSugerida({ categoria: "kids", faixa: "cinza", nascimento: "2017-03-01" }, HOJE), "Cinza · 9 anos");
});

test("medalhas do aluno vêm dos campeonatos, mais recentes primeiro", () => {
  const eventos = [
    { id: "e1", tipo: "Campeonato", titulo: "Copa A", data: "2026-03-01", inscritos: ["a"], detalhes: { a: { medalha: "prata", categoria: "Azul" } } },
    { id: "e2", tipo: "Campeonato", titulo: "Copa B", data: "2026-08-01", inscritos: ["a", "b"], detalhes: { a: { medalha: "ouro" }, b: { medalha: "participou" } } },
    { id: "e3", tipo: "Confraternização", titulo: "Festa", data: "2026-09-01", inscritos: ["a"], detalhes: { a: { medalha: "ouro" } } }
  ];
  assert.deepEqual(medalhasDoAluno(eventos, "a").map(m => [m.titulo, m.medalha]), [["Copa B", "ouro"], ["Copa A", "prata"]]);
  assert.deepEqual(medalhasDoAluno(eventos, "b"), []);
  assert.deepEqual(quadroMedalhas(eventos[1]), { ouro: 1, prata: 0, bronze: 0 });
  assert.equal(temMedalhas(eventos[1]), true);
  assert.equal(temMedalhas(eventos[2]), false);
  assert.deepEqual(Object.keys(MEDALHAS), ["ouro", "prata", "bronze", "participou"]);
});

test("campeonato agrupa por faixa (adultos antes dos kids) e junta quem tem a mesma categoria", () => {
  const alunos = {
    a: { id: "a", nome: "Ana", faixa: "azul", nascimento: "2000-01-01" },
    b: { id: "b", nome: "Bia", faixa: "branca", nascimento: "2000-01-01" },
    c: { id: "c", nome: "Caio", faixa: "azul", nascimento: "1980-01-01" },
    d: { id: "d", nome: "Duda", faixa: "azul", nascimento: "2001-01-01" },
    k: { id: "k", nome: "Kauã", faixa: "cinza-branca", categoria: "kids", nascimento: "2017-06-01" },
    z: { id: "z", nome: "Zeca", faixa: "cinza", categoria: "kids", nascimento: "2016-06-01" }
  };
  const ev = { inscritos: ["k", "a", "b", "c", "d", "z", "sumiu"], detalhes: { c: { categoria: "Azul · Adulto" } } };
  const g = gruposCampeonato(ev, alunos, HOJE);
  assert.deepEqual(g.map(x => x.titulo), ["Branca", "Azul", "Kids · Cinza"]);
  assert.deepEqual(g[1].atletas.map(x => [x.aluno.id, x.categoria]), [["a", "Azul · Adulto"], ["c", "Azul · Adulto"], ["d", "Azul · Adulto"]]);
  assert.deepEqual(g[2].atletas.map(x => [x.aluno.id, x.categoria]), [["z", "Cinza · 10 anos"], ["k", "Cinza e branca · 9 anos"]]);
});

test("resumo da confraternização: pessoas, recebido e quanto falta", () => {
  const ev = { valorPessoa: 50, inscritos: ["a", "b", "c"], detalhes: { a: { acompanhantes: 2, pago: true }, b: { acompanhantes: 0, pago: false }, c: {} } };
  assert.deepEqual(resumoConfra(ev), { pessoas: 5, pagos: 1, recebido: 150, falta: 100 });
  assert.deepEqual(resumoConfra({ inscritos: ["a"] }), { pessoas: 1, pagos: 0, recebido: 0, falta: 0 });
});
