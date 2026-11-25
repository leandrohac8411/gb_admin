// Presença pela foto: o botão dizia "7 presenças" com 10 rostos e ninguém entendia por quê (25/11/2026).
// E o professor que treina também ganha presença, na ficha de aluno ligada a ele.
import { test } from "node:test";
import assert from "node:assert/strict";
import { presencasDosRostos, resumoDosRostos } from "../js/logica/reconhecimento.js";

const ctx = {
  ehProf: id => id === "p1" || id === "p2",
  alunoDoProf: id => ({ p1: "a-prof" }[id] || ""),
  jaPresente: id => id === "murilo"
};
const foto = [
  { alunoId: "p1", marcado: false },          // professor, não treinou
  { alunoId: "murilo", marcado: true },       // já estava na lista
  { alunoId: "a1", marcado: true }, { alunoId: "a2", marcado: true }, { alunoId: "a3", marcado: true },
  { alunoId: "a4", marcado: true }, { alunoId: "a5", marcado: true }, { alunoId: "a6", marcado: true },
  { alunoId: "a7", marcado: true },
  { alunoId: "", marcado: false }             // rosto sem aluno escolhido
];

test("resumo explica cada rosto: 10 = 1 professor + 7 novas + 1 já estava + 1 sem aluno", () => {
  assert.deepEqual(resumoDosRostos(foto, ctx), { rostos: 10, professores: 1, novos: 7, jaEstavam: 1, semAluno: 1, desmarcados: 0 });
  assert.deepEqual(presencasDosRostos(foto, ctx), ["a1", "a2", "a3", "a4", "a5", "a6", "a7"]);
});

test("professor que treinou ganha presença no aluno ligado; sem ligação não dá", () => {
  const f = [{ alunoId: "p1", marcado: true }, { alunoId: "p2", marcado: true }, { alunoId: "a1", marcado: false }];
  assert.deepEqual(presencasDosRostos(f, ctx), ["a-prof"]);
  assert.deepEqual(resumoDosRostos(f, ctx), { rostos: 3, professores: 1, novos: 1, jaEstavam: 0, semAluno: 0, desmarcados: 1 });
});

test("professor ligado a um aluno que também apareceu em outro rosto conta uma vez só", () => {
  const f = [{ alunoId: "p1", marcado: true }, { alunoId: "a-prof", marcado: true }];
  assert.deepEqual(presencasDosRostos(f, ctx), ["a-prof"]);
});
