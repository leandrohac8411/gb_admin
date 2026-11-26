// Portal do aluno com as telas do Diário de Tatame: os dados do GB Admin no formato que o Diário usa.
import { test } from "node:test";
import assert from "node:assert/strict";
import { montarEstadoDiario, aulaParaGravar, LIMITE_AULA } from "../js/logica/portal-diario.js";

const grade = {
  turmas: { t1: { diaSemana: 3, horario: "12:30", programa: "GB1", professor: "Diego", modeloAulaId: "", aula: "", duracaoMin: 60 } },
  cronograma: [{ programa: "GB1", semana: 13, aulaB: { tema: "Costas: gola", tecnicas: [{ nome: "Gola", categoria: "Costas" }] } }],
  ancoras: [{ programa: "GB1", data: "2026-11-16", semana: 12 }], modelosAula: []
};
const portal = { nome: "Ana Souza", nascimento: "1990-05-01", sexo: "F", peso: 61.5, telefone: "61 9999-0000", plano: "Mensal", foto: "data:image/jpeg;base64,AAAA", faixa: "roxa", graus: 2, desdeFaixa: "2026-03-10", ultimaGraduacao: "2026-06-01",
  presencas: [{ data: "2026-11-25", turmaId: "t1", hora: "12:31", horario: "12:30", programa: "GB1" },
    { data: "2026-11-11", turmaId: "velha", hora: "07:00", horario: "07:00", programa: "GB2" }], proximoPasso: { faltamAulas: 10 } };
const base = { portal, grade, diario: [], pendentes: [], prefs: {}, email: "ana@x.com", alunoId: "a1" };

test("perfil vem do GB Admin (nome, nascimento, sexo, faixa e graus) e as metas do aluno", () => {
  const e = montarEstadoDiario({ ...base, prefs: { metaSemanal: 3, nascimento: "2000-01-01", sexo: "M" } });
  assert.equal(e.perfil.nascimento, "1990-05-01");
  assert.equal(e.perfil.sexo, "F");
  assert.equal(e.perfil.peso, 61.5);
  assert.equal(e.perfil.telefone, "61 9999-0000");
  assert.equal(e.perfil.plano, "Mensal");
  assert.equal(e.perfil.foto, "data:image/jpeg;base64,AAAA");
  assert.equal(e.perfil.nome, "Ana Souza");
  assert.deepEqual(e.perfil.faixa, { cor: "roxa", desde: "2026-03" });
  assert.equal(e.perfil.graus.length, 2);
  assert.equal(e.perfil.graus[1].data, "2026-06-01", "o último grau tem a data da última graduação");
  assert.equal(e.perfil.graus[0].data, undefined);
  assert.equal(e.perfil.metaSemanal, 3);
  assert.equal(e.perfil.metaAulasRoxa, 175, "padrão do Diário");
});

test("grade, currículo e ciclo no formato do Diário", () => {
  const e = montarEstadoDiario(base);
  assert.deepEqual(e.grade, [{ id: "t1", diaSemana: 3, horario: "12:30", programa: "GB1", professor: "Diego", aula: null, duracaoMin: 60 }]);
  assert.deepEqual(e.curriculo["GB1-13"].aulaB.tema, "Costas: gola");
  assert.deepEqual(e.ancoras, grade.ancoras);
});

test("cada presença vira uma aula do diário (com check-in na academia), mesmo sem anotação; turma antiga continua", () => {
  const e = montarEstadoDiario(base);
  const a = e.aulas.find(x => x.id === "t1_2026-11-25");
  assert.equal(a.horario, "12:30");
  assert.equal(a.professor, "Diego");
  assert.equal(a.local.verificado, true);
  assert.deepEqual(a.realizada, { programa: "GB1", semana: 13, aula: "B" });
  assert.equal(a.fotoId, "aula:t1_2026-11-25", "a foto é a que a academia tirou");
  const velha = e.aulas.find(x => x.id === "velha_2026-11-11");
  assert.equal(velha.horario, "07:00");
  assert.equal(velha.realizada.programa, "GB2");
});

test("o que o aluno escreveu entra por cima; check-in pendente já conta; diário sem presença não conta", () => {
  const diario = [{ id: "t1_2026-11-25", turmaId: "t1", data: "2026-11-25", dificuldade: 4, aprendi: "pegada", tecnicas: [{ nome: "Gola", categoria: "Costas", resultado: "bem" }] },
    { id: "t1_2026-11-18", turmaId: "t1", data: "2026-11-18", aprendi: "sem presença" }];
  const pendentes = [{ id: "a1_t1_2026-12-02", turmaId: "t1", data: "2026-12-02", hora: "12:20" }];
  const e = montarEstadoDiario({ ...base, diario, pendentes });
  const a = e.aulas.find(x => x.id === "t1_2026-11-25");
  assert.equal(a.dificuldade, 4);
  assert.equal(a.aprendi, "pegada");
  assert.ok(e.aulas.some(x => x.id === "t1_2026-12-02"));
  assert.ok(!e.aulas.some(x => x.id === "t1_2026-11-18"));
  assert.equal(e.aulas.length, 3);
});

test("aulaParaGravar: só as anotações, em texto, com limite de tamanho", () => {
  const txt = aulaParaGravar({ id: "x", turmaId: "t1", data: "2026-11-25", dificuldade: 3, aprendi: "a", fotoId: "aula:x", local: { verificado: true } });
  assert.deepEqual(JSON.parse(txt), { dificuldade: 3, aprendi: "a", local: { verificado: true } });
  assert.equal(aulaParaGravar({ aprendi: "x".repeat(LIMITE_AULA) }), null);
});
