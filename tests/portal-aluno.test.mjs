// Portal do aluno: regras das telas do /aluno. Plano 2026-11-25, tarefa 5.
import { test } from "node:test";
import assert from "node:assert/strict";
import { diarioValido, esteveNaAula, aulasDoDia, frequenciaDoMes, mensagemDeErroLogin } from "../js/logica/portal-aluno.js";
import { espelhoGrade } from "../js/logica/portal.js";
import { gerarDados } from "../js/dados-ficticios.js";
import { temaDaAula } from "../js/logica/tema.js";

test("diarioValido: limites iguais aos da regra do banco", () => {
  const ok = diarioValido({ aprendi: " passagem ", revisar: "", dificuldade: 3, tecnicas: [{ nome: "Toreando", resultado: "bem" }], extra: 1 });
  assert.deepEqual(ok, { aprendi: "passagem", revisar: "", dificuldade: 3, tecnicas: [{ nome: "Toreando", resultado: "bem" }] });
  assert.equal(diarioValido({ dificuldade: 6 }), null);
  assert.equal(diarioValido({ dificuldade: 0 }), null);
  assert.equal(diarioValido({ aprendi: "x".repeat(4001) }), null);
  assert.equal(diarioValido({ tecnicas: Array.from({ length: 51 }, (_, i) => ({ nome: `t${i}`, resultado: "bem" })) }), null);
  assert.equal(diarioValido({ tecnicas: [{ nome: "X", resultado: "talvez" }] }), null);
  assert.deepEqual(diarioValido({}), { aprendi: "", revisar: "", tecnicas: [] }, "dificuldade é opcional");
});

test("esteveNaAula: pela presença do espelho ou por check-in ainda pendente", () => {
  const portal = { presencas: [{ data: "2026-11-25", turmaId: "t1" }] };
  assert.equal(esteveNaAula(portal, [], "t1", "2026-11-25"), true);
  assert.equal(esteveNaAula(portal, [], "t1", "2026-11-24"), false);
  assert.equal(esteveNaAula(portal, [{ turmaId: "t2", data: "2026-11-25" }], "t2", "2026-11-25"), true);
  assert.equal(esteveNaAula(null, [], "t1", "2026-11-25"), false);
});

test("aulasDoDia: turmas adultas do dia, em ordem, com tema do ciclo e roteiro", () => {
  const d = gerarDados("2026-11-25");
  const grade = espelhoGrade(d);
  const aulas = aulasDoDia(grade, "2026-11-25");
  assert.deepEqual(aulas.map(a => a.turmaId), ["3-1230", "3-1900", "3-2000"]);
  const gb1 = aulas[0];
  assert.equal(gb1.programa, "GB1");
  assert.deepEqual(gb1.temas, temaDaAula({ config: { ancoras: grade.ancoras }, cronograma: grade.cronograma }, { ...grade.turmas["3-1230"], id: "3-1230" }, "2026-11-25"));
  assert.equal(gb1.temas[0].aula, "B", "quarta é Aula B");
  assert.deepEqual(gb1.roteiro, d.modelosAula.find(m => m.id === grade.turmas["3-1230"].modeloAulaId).blocos);
  assert.deepEqual(aulasDoDia(grade, "2026-11-29"), [], "domingo sem aula");
});

test("frequenciaDoMes: presenças do mês (uma por dia e turma)", () => {
  const p = [{ data: "2026-11-25", turmaId: "a" }, { data: "2026-11-03", turmaId: "a" }, { data: "2026-10-31", turmaId: "a" }];
  assert.equal(frequenciaDoMes(p, "2026-11"), 2);
  assert.equal(frequenciaDoMes([], "2026-11"), 0);
});

test("mensagemDeErroLogin: em português, com padrão para o resto", () => {
  assert.equal(mensagemDeErroLogin("auth/invalid-credential"), "E-mail ou senha incorretos.");
  assert.equal(mensagemDeErroLogin("auth/email-already-in-use"), "Esse e-mail já tem conta. Toque em Entrar ou em Esqueci a senha.");
  assert.equal(mensagemDeErroLogin("auth/weak-password"), "A senha precisa ter pelo menos 6 caracteres.");
  assert.equal(mensagemDeErroLogin("auth/too-many-requests"), "Muitas tentativas. Espere um pouco e tente de novo.");
  assert.equal(mensagemDeErroLogin("auth/network-request-failed"), "Sem internet. Confira a conexão e tente de novo.");
  assert.equal(mensagemDeErroLogin("auth/qualquer"), "Não deu para entrar. Tente de novo.");
});
