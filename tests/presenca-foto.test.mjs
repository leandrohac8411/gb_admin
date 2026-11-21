import { test } from "node:test";
import assert from "node:assert/strict";
import { sugerirPresenca } from "../js/logica/presenca-foto.js";

const turma = { id: "t1", diaSemana: 1, horario: "19:00", categoria: "adulto" };
const outra = { id: "t2", diaSemana: 1, horario: "20:00", categoria: "adulto" };
const alunos = [
  { id: "a", nome: "Ana", status: "ativo", categoria: "adulto" },
  { id: "b", nome: "Bia", status: "ativo", categoria: "adulto" },
  { id: "c", nome: "Caio", status: "ativo", categoria: "adulto" },
  { id: "d", nome: "Davi", status: "trancado", categoria: "adulto" },
  { id: "k", nome: "Kika", status: "ativo", categoria: "kids" }
];
const ck = (alunoId, turmaId, data) => ({ alunoId, turmaId, data, hora: "19:00" });
const checkins = [
  ck("a", "t1", "2026-11-02"), ck("a", "t1", "2026-11-09"), ck("a", "t1", "2026-11-16"),
  ck("b", "t1", "2026-11-09"),
  ck("c", "t2", "2026-11-16"),
  ck("b", "t1", "2026-11-23")   // já presente hoje
];

test("ordena por quem mais vem nessa turma e marca os já presentes", () => {
  const r = sugerirPresenca({ alunos, checkins, turmas: [turma, outra] }, turma, "2026-11-23", 2);
  assert.deepEqual(r.map(x => x.aluno.id), ["b", "a", "c"]);      // presentes primeiro, depois frequência
  assert.equal(r.find(x => x.aluno.id === "b").presente, true);
  assert.equal(r.find(x => x.aluno.id === "a").vezes, 3);
  // marcados: já presentes + os mais frequentes até completar o número de pessoas
  assert.deepEqual(r.filter(x => x.marcado).map(x => x.aluno.id), ["b", "a"]);
});

test("ignora trancados e outra categoria; número zero não marca ninguém novo", () => {
  const r = sugerirPresenca({ alunos, checkins, turmas: [turma, outra] }, turma, "2026-11-23", 0);
  assert.ok(!r.some(x => x.aluno.id === "d" || x.aluno.id === "k"));
  assert.deepEqual(r.filter(x => x.marcado).map(x => x.aluno.id), ["b"]);
});

test("quem nunca veio fica no fim, sem marcar, mesmo com foto cheia", () => {
  const r = sugerirPresenca({ alunos, checkins, turmas: [turma, outra] }, turma, "2026-11-23", 10);
  assert.deepEqual(r.filter(x => x.marcado).map(x => x.aluno.id), ["b", "a", "c"]);
});
