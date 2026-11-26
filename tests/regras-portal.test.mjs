// Portal do aluno: confere o texto das regras do Firestore (o emulador não roda aqui). Plano 2026-11-25, tarefa 3.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const regras = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
const bloco = nome => { const i = regras.indexOf(`match /${nome}`); assert.ok(i >= 0, `falta match /${nome}`); return regras.slice(i, regras.indexOf("\n    }", i)); };
const G = /request\.resource\.data\.turmaId in get\(\/databases\/\$\(database\)\/documents\/portalGrade\/atual\)\.data\.turmas/;

test("aluno só entra com e-mail verificado e acesso ativo", () => {
  const f = regras.slice(regras.indexOf("function aluno()"), regras.indexOf("function meuAlunoId()"));
  assert.match(f, /email_verified == true/);
  assert.match(f, /acessos\/\$\(request\.auth\.token\.email\)/);
  assert.match(f, /\.data\.ativo == true/);
});

test("cada coleção do portal tem dono certo e só o painel grava o espelho", () => {
  assert.match(bloco("acessos/{email}"), /allow write: if permitido\(\);/);
  assert.match(bloco("acessos/{email}"), /request\.auth\.token\.email == email/);
  assert.match(bloco("portal/{alunoId}"), /alunoId == meuAlunoId\(\)/);
  assert.match(bloco("portal/{alunoId}"), /allow write: if permitido\(\);/);
  assert.match(bloco("portalGrade/{id}"), /allow write: if permitido\(\);/);
  assert.match(bloco("diarios/{alunoId}/aulas/{aulaId}"), /alunoId == meuAlunoId\(\) && diarioOk/);
  const ck = bloco("checkinsAluno/{id}");
  assert.match(ck, /request\.resource\.data\.alunoId == meuAlunoId\(\)/);
  assert.match(ck, /allow delete: if permitido\(\);/);
  assert.doesNotMatch(ck, /allow update/);
});

test("fotos: aluno só vê foto de turma adulta do portal; foto que não existe responde vazio", () => {
  assert.match(bloco("fotos/{fotoId}"), /aluno\(\) && \(resource == null \|\| resource\.data\.turmaId in get\(\/databases\/\$\(database\)\/documents\/portalGrade\/atual\)\.data\.turmas/);
});

test("formatos: diário (texto do Diário, limitado, sem data futura) e check-in a até 100 m", () => {
  const dia = regras.slice(regras.indexOf("function diarioOk"), regras.indexOf("function checkinOk"));
  assert.match(dia, /hasOnly\(\['turmaId', 'data', 'aula', 'atualizadoEm'\]\)/);
  assert.match(dia, /d\.aula is string && d\.aula\.size\(\) <= 20000/);
  assert.match(dia, /request\.time >= timestamp\.date\(/);
  const ck = regras.slice(regras.indexOf("function checkinOk"));
  assert.match(ck, /distancia >= 0 && d\.distancia <= 100/);
  assert.match(ck, /criadoEm == request\.time/);
});

test("metas e peso: só o próprio aluno, com formato conferido", () => {
  assert.match(bloco("diarios/{alunoId} "), /alunoId == meuAlunoId\(\) && prefsOk/);
  const pr = regras.slice(regras.indexOf("function prefsOk"), regras.indexOf("function pesoOk"));
  assert.match(pr, /hasOnly\(\['metaSemanal'\]\)/, "nascimento, sexo e a meta da faixa vêm do GB Admin");
  assert.match(bloco("diarios/{alunoId}/pesos/{id}"), /alunoId == meuAlunoId\(\) && pesoOk/);
  assert.match(regras.slice(regras.indexOf("function pesoOk")), /d\.kg > 20 && d\.kg < 250/);
});

test("diário e check-in só de turma da grade da academia", () => {
  assert.match(bloco("diarios/{alunoId}/aulas/{aulaId}"), G);
  assert.match(bloco("checkinsAluno/{id}"), G);
});

test("nenhuma regra aberta para qualquer um", () => {
  assert.doesNotMatch(regras, /if true/);
});

test("quem participou de cada aula: aluno liberado lê, só o painel grava", () => {
  assert.match(bloco("portalAulas/{id}"), /allow read: if permitido\(\) \|\| aluno\(\);/);
  assert.match(bloco("portalAulas/{id}"), /allow write: if permitido\(\);/);
});
