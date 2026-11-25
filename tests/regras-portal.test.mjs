// Portal do aluno: confere o texto das regras do Firestore (o emulador não roda aqui). Plano 2026-11-25, tarefa 3.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const regras = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
const bloco = nome => { const i = regras.indexOf(`match /${nome}`); assert.ok(i >= 0, `falta match /${nome}`); return regras.slice(i, regras.indexOf("\n    }", i)); };

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

test("fotos: aluno só vê foto de turma adulta do portal", () => {
  assert.match(bloco("fotos/{fotoId}"), /aluno\(\) && resource\.data\.turmaId in get\(\/databases\/\$\(database\)\/documents\/portalGrade\/atual\)\.data\.turmas/);
});

test("formatos: diário com limites e check-in a até 100 m", () => {
  const dia = regras.slice(regras.indexOf("function diarioOk"), regras.indexOf("function checkinOk"));
  assert.match(dia, /hasOnly\(\['aprendi', 'revisar', 'dificuldade', 'tecnicas', 'turmaId', 'data', 'atualizadoEm'\]\)/);
  assert.match(dia, /textoAte\(d, 'aprendi', 4000\) && textoAte\(d, 'revisar', 4000\)/);
  assert.match(dia, /dificuldade >= 1 && d\.dificuldade <= 5/);
  const ck = regras.slice(regras.indexOf("function checkinOk"));
  assert.match(ck, /distancia >= 0 && d\.distancia <= 100/);
  assert.match(ck, /criadoEm == request\.time/);
});

test("nenhuma regra aberta para qualquer um", () => {
  assert.doesNotMatch(regras, /if true/);
});
