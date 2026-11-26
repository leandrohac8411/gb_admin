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
  assert.ok(!("valor" in e), "nada de mensalidade no espelho");
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
  assert.deepEqual(g.turmas.t1, { diaSemana: 3, horario: "12:30", programa: "GB1", professor: "Diego Farias", modeloAulaId: "m1", aula: "", duracaoMin: 60 });
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

import { problemaNoEmail } from "../js/logica/portal.js";
test("espelhoAluno leva nascimento e sexo do cadastro (o portal não pede de novo)", () => {
  const e = espelhoAluno(d, { ...ana, nascimento: "1990-05-01", sexo: "F" }, "2026-11-25");
  assert.equal(e.nascimento, "1990-05-01");
  assert.equal(e.sexo, "F");
  assert.equal(espelhoAluno(d, ana, "2026-11-25").nascimento, null);
});

test("problemaNoEmail: vazio pode; formato e e-mail repetido de outro aluno não", () => {
  const alunos = [{ id: "a1", emailPortal: "ana@x.com" }, { id: "a2" }];
  assert.equal(problemaNoEmail("", "a2", alunos), "");
  assert.equal(problemaNoEmail(" Ana@X.com ", "a1", alunos), "", "o próprio e-mail dele");
  assert.equal(problemaNoEmail("ana@x.com", "a2", alunos), "Esse e-mail já é de outro aluno.");
  assert.equal(problemaNoEmail("ana@", "a2", alunos), "Confira o e-mail.");
  assert.equal(problemaNoEmail("novo@x.com", null, alunos), "", "aluno novo");
});

test("espelhoAluno leva também peso, telefone e plano do cadastro (o aluno não digita nada)", () => {
  const dd = { ...d, planos: [{ id: "Mensal", nome: "Mensal" }] };
  const e = espelhoAluno(dd, { ...ana, peso: 77.8, telefone: "61 99999-0000", plano: "Mensal" }, "2026-11-25");
  assert.equal(e.peso, 77.8);
  assert.equal(e.telefone, "61 99999-0000");
  assert.equal(e.plano, "Mensal");
  const vazio = espelhoAluno(d, { ...ana, telefone: "", peso: null }, "2026-11-25");
  assert.equal(vazio.peso, null);
  assert.equal(vazio.telefone, "");
  assert.ok(!("valor" in e), "valor da mensalidade não vai para o portal");
});

test("espelhoAluno leva a foto cadastrada no GB Admin (miniatura do rosto) para o perfil do portal", () => {
  const mini = "data:image/jpeg;base64,AAAA";
  const dd = { ...d, rostos: new Map([["a1", { mini, descritores: [[1]] }]]) };
  const e = espelhoAluno(dd, ana, "2026-11-25");
  assert.equal(e.foto, mini);
  assert.ok(!("descritores" in e), "os números do rosto não vão para o portal");
  assert.equal(espelhoAluno(d, ana, "2026-11-25").foto, null, "sem foto cadastrada");
  assert.equal(espelhoAluno({ ...d, rostos: new Map([["a1", { mini: "javascript:alert(1)" }]]) }, ana, "2026-11-25").foto, null, "só JPEG");
});

import { espelhoAulas, DIAS_AULAS } from "../js/logica/portal.js";
test("espelhoAulas: quem participou de cada aula adulta dos últimos dias (só o nome)", () => {
  const dd = { ...d, alunos: [...d.alunos, { id: "a2", nome: "Bruno Lima", categoria: "adulto", status: "ativo", telefone: "x" }],
    checkins: [...d.checkins, { id: "c9", alunoId: "a2", turmaId: "t1", data: "2026-11-25", hora: "12:30" },
      { id: "c10", alunoId: "a2", turmaId: "t1", data: "2026-08-01", hora: "12:30" }] };
  const m = espelhoAulas(dd, "2026-11-25");
  assert.equal(DIAS_AULAS, 30);
  assert.deepEqual(m.get("t1_2026-11-25"), { turmaId: "t1", data: "2026-11-25", presentes: ["Ana Souza", "Bruno Lima"] });
  assert.ok(m.has("t1_2026-11-18"));
  assert.ok(!m.has("tk_2026-11-25"), "aula kids fica fora");
  assert.ok(!m.has("t1_2026-08-01"), "mais antiga que 30 dias fica fora");
  assert.ok(!m.has("sumiu_2026-11-20"), "turma que não está mais na grade fica fora");
  assert.ok(!JSON.stringify([...m.values()]).includes("x"), "nada além do nome");
});

import { REGRAS } from "../js/logica/graduacao.js";
test("espelhoAluno leva a meta de aulas da faixa pela regra da academia (4 graus + a troca de faixa)", () => {
  assert.equal(espelhoAluno(d, ana, "2026-11-25").metaFaixa, REGRAS.aulasPorGrau * 5);
  assert.equal(espelhoAluno(d, { ...ana, faixa: "preta" }, "2026-11-25").metaFaixa, null, "faixa preta não tem próxima");
});
