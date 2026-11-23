import { test } from "node:test";
import assert from "node:assert/strict";
import { mesclar, paraLocal, salvarComAviso } from "../js/logica/mesclar.js";
import { gerarDados } from "../js/dados-ficticios.js";

const v = Array.from({ length: 128 }, () => 0.01);
const reais = () => ({
  alunos: [
    { id: "R1", nome: "Aluno Real Teste", faixa: "azul", graus: 2, categoria: "adulto", status: "ativo", desde: "2024-01-10", desdeFaixa: "2025-03-01", ultimaGraduacao: "2025-03-01", real: true },
    { id: "R2", nome: "Filho", faixa: "cinza", graus: 0, categoria: "kids", status: "ativo", desde: "2025-02-01", desdeFaixa: "2025-02-01", ultimaGraduacao: "2025-02-01", nascimento: "2018-05-05", real: true }
  ],
  rostos: [{ id: "R1", d0: v, consentimento: { por: "Leandro", responsavel: false, data: "2026-11-23" } }],
  turmas: [{ id: "d-1-1230", diaSemana: 1, horario: "12:30", programa: "GB1", professor: "Prof. Real", duracaoMin: 60, categoria: "adulto" }],
  checkins: [{ id: "C1", alunoId: "R1", turmaId: "d-1-1230", data: "2026-11-23", hora: "12:30", origem: "rosto" }]
});

test("mesclar soma alunos reais, troca só as turmas adultas e mantém as kids", () => {
  const f = gerarDados("2026-11-20");
  const kids = f.turmas.filter(t => t.categoria === "kids").length;
  const d = mesclar(f, reais());
  assert.equal(d.alunos.length, f.alunos.length + 2);
  assert.ok(d.alunos.filter(a => a.real).every(a => a.id.startsWith("R")));
  const adultas = d.turmas.filter(t => t.categoria === "adulto");
  assert.deepEqual(adultas.map(t => t.id), ["d-1-1230"]);
  assert.equal(d.turmas.filter(t => t.categoria === "kids").length, kids);
  assert.ok(d.checkins.some(c => c.id === "C1" && c.real));
  assert.equal(d.rostos.get("R1").descritores.length, 1);
});

test("turma real ganha professor que as telas conseguem mostrar", () => {
  const d = mesclar(gerarDados("2026-11-20"), reais());
  const t = d.turmas.find(x => x.id === "d-1-1230");
  assert.equal(d.professores.find(p => p.id === t.professorId).nome, "Prof. Real");
});

test("sem turmas reais, as turmas fictícias ficam", () => {
  const f = gerarDados("2026-11-20");
  const d = mesclar(f, { ...reais(), turmas: [] });
  assert.equal(d.turmas.length, f.turmas.length);
});

test("mesclar não altera os fictícios originais (cada snapshot recomeça do zero)", () => {
  const f = gerarDados("2026-11-20"), antes = JSON.stringify(f);
  mesclar(f, reais()); mesclar(f, reais());
  assert.equal(JSON.stringify(f), antes);
  assert.equal(mesclar(f, reais()).alunos.length, f.alunos.length + 2);
});

test("paraLocal tira tudo que é real e os rostos, sem mexer no original", () => {
  const d = mesclar(gerarDados("2026-11-20"), reais());
  const l = paraLocal(d);
  const texto = JSON.stringify(l);
  assert.ok(!texto.includes('"real":true'));
  assert.equal(l.rostos, undefined);
  assert.ok(d.alunos.some(a => a.real) && d.rostos);
  assert.ok(!l.turmas.some(t => t.id === "d-1-1230"));
  assert.ok(l.turmas.some(t => t.categoria === "adulto"), "volta a grade fictícia adulta para a demo");
});

test("salvarComAviso: erro na nuvem avisa e devolve false; sucesso devolve true", async () => {
  const avisos = [];
  assert.equal(await salvarComAviso(Promise.reject(new Error("x")), "ok", t => avisos.push(t)), false);
  assert.match(avisos[0], /Não salvou na nuvem/);
  assert.equal(await salvarComAviso(Promise.resolve(1), "Salvo", t => avisos.push(t)), true);
  assert.equal(avisos[1], "Salvo");
});

import { criarStore } from "../js/store.js";

test("store.salvar nunca grava dado real no navegador", () => {
  const mem = new Map(), arm = { getItem: k => mem.get(k) ?? null, setItem: (k, x) => mem.set(k, x), removeItem: k => mem.delete(k) };
  const store = criarStore("2026-11-20", arm);
  store.dados = mesclar(store.dados, reais());
  assert.equal(store.salvar(), true);
  const gravado = [...mem.values()].join("");
  assert.ok(!gravado.includes("Aluno Real Teste") && !gravado.includes('"real":true') && !gravado.includes("d-1-1230"));
});

import { resumoDashboard } from "../js/logica/indicadores.js";

test("aluno real sem data de nascimento não derruba o Dashboard", () => {
  const d = mesclar(gerarDados("2026-11-20"), reais());
  assert.doesNotThrow(() => resumoDashboard(d, "2026-11-20"));
  assert.ok(!resumoDashboard(d, "2026-11-20").aniversariantes.some(a => a.id === "R1"));
});

test("salvarComAviso: sem permissão diz para entrar de novo, não fala de internet", async () => {
  const avisos = [];
  const e = Object.assign(new Error("x"), { code: "permission-denied" });
  assert.equal(await salvarComAviso(Promise.reject(e), "ok", t => avisos.push(t)), false);
  assert.match(avisos[0], /permissão/);
});
