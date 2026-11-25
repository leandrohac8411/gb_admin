// Portal do aluno: espelho do painel (o que cada aluno pode ver). Plano 2026-11-25, tarefa 1.
import { test } from "node:test";
import assert from "node:assert/strict";
import { podeTerAcesso, emailValido, espelhoAluno, espelhoAcesso, espelhoGrade, mudancasEspelho } from "../js/logica/portal.js";
import { aptidao } from "../js/logica/graduacao.js";

const ana = { id: "a1", nome: "Ana Souza", categoria: "adulto", status: "ativo", faixa: "azul", graus: 1, desdeFaixa: "2026-01-10", ultimaGraduacao: "2026-06-01", telefone: "61 9999-0000", valor: 280 };
const d = {
  alunos: [ana, { id: "k1", nome: "Lia Kids", categoria: "kids", status: "ativo" }],
  professores: [{ id: "p1", nome: "Diego Farias" }],
  turmas: [
    { id: "t1", diaSemana: 3, horario: "12:30", programa: "GB1", professorId: "p1", modeloAulaId: "m1", categoria: "adulto", real: true, publico: "x" },
    { id: "tk", diaSemana: 3, horario: "17:00", programa: "Kids", professorId: "p1", categoria: "kids" }
  ],
  checkins: [
    { id: "c1", alunoId: "a1", turmaId: "t1", data: "2026-11-18", hora: "12:30" },
    { id: "c2", alunoId: "a1", turmaId: "t1", data: "2026-11-25", hora: "12:30" },
    { id: "c3", alunoId: "a1", turmaId: "sumiu", data: "2026-11-20", hora: "19:00" },
    { id: "c4", alunoId: "k1", turmaId: "tk", data: "2026-11-25", hora: "17:00" }
  ],
  cronograma: [{ programa: "GB1", semana: 13, aulaA: { tema: "Passagem", tecnicas: [] } }],
  config: { ancoras: [{ programa: "GB1", data: "2026-11-16", semana: 12 }] },
  modelosAula: [{ id: "m1", nome: "Padrão", blocos: [{ nome: "Aquecimento", min: 10 }] }]
};

test("espelhoAluno: presenças do aluno, mais recente primeiro, e aula de turma removida continua legível", () => {
  const e = espelhoAluno(d, ana, "2026-11-25");
  assert.deepEqual(e.presencas, [
    { data: "2026-11-25", turmaId: "t1", hora: "12:30", horario: "12:30", programa: "GB1" },
    { data: "2026-11-20", turmaId: "sumiu", hora: "19:00", horario: "", programa: "" },
    { data: "2026-11-18", turmaId: "t1", hora: "12:30", horario: "12:30", programa: "GB1" }
  ]);
  assert.deepEqual({ nome: e.nome, faixa: e.faixa, graus: e.graus, desdeFaixa: e.desdeFaixa, ultimaGraduacao: e.ultimaGraduacao },
    { nome: "Ana Souza", faixa: "azul", graus: 1, desdeFaixa: "2026-01-10", ultimaGraduacao: "2026-06-01" });
  assert.deepEqual(e.proximoPasso, aptidao(ana, d.checkins, "2026-11-25"));
  assert.ok(!("telefone" in e) && !("valor" in e), "nada de telefone ou mensalidade no espelho");
});

test("espelhoAcesso: trancado perde o acesso (ativo false) e volta ao reativar", () => {
  assert.deepEqual(espelhoAcesso(ana, "ana@x.com"), { alunoId: "a1", nome: "Ana Souza", ativo: true });
  assert.equal(espelhoAcesso({ ...ana, status: "trancado" }, "ana@x.com").ativo, false);
});

test("podeTerAcesso: só adulto (kids fica para depois)", () => {
  assert.equal(podeTerAcesso({ categoria: "kids" }), false);
  assert.equal(podeTerAcesso({ categoria: "adulto" }), true);
  assert.equal(podeTerAcesso({}), true);
});

test("emailValido: minúsculas e sem espaços; inválido dá null", () => {
  assert.equal(emailValido(" Ana@X.com "), "ana@x.com");
  assert.equal(emailValido("ana"), null);
  assert.equal(emailValido("ana@x"), null);
  assert.equal(emailValido(""), null);
});

test("espelhoGrade: só turmas adultas, só os campos do portal e nenhum dado de aluno", () => {
  const g = espelhoGrade(d);
  assert.deepEqual(Object.keys(g.turmas), ["t1"]);
  assert.deepEqual(g.turmas.t1, { diaSemana: 3, horario: "12:30", programa: "GB1", professor: "Diego Farias", modeloAulaId: "m1", aula: "" });
  assert.deepEqual(g.cronograma, d.cronograma);
  assert.deepEqual(g.ancoras, d.config.ancoras);
  assert.deepEqual(g.modelosAula, d.modelosAula);
  const txt = JSON.stringify(g);
  for (const a of d.alunos) { assert.ok(!txt.includes(a.nome)); assert.ok(!txt.includes(`"${a.id}"`)); }
});

test("mudancasEspelho: grava só o que mudou e apaga o que sumiu", () => {
  const novos = new Map([["a1", { x: 1 }], ["a2", { x: 2 }]]);
  const r1 = mudancasEspelho(new Map(), novos);
  assert.deepEqual(r1.gravar.map(([id]) => id), ["a1", "a2"]);
  assert.deepEqual(r1.apagar, []);
  const anterior = new Map([["a1", JSON.stringify({ x: 1 })], ["a3", "{}"]]);
  const r2 = mudancasEspelho(anterior, new Map([["a1", { x: 1 }], ["a2", { x: 3 }]]));
  assert.deepEqual(r2.gravar.map(([id]) => id), ["a2"]);
  assert.deepEqual(r2.apagar, ["a3"]);
});
