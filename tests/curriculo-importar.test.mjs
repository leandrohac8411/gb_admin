// Importar o currículo real troca as semanas do arquivo e tira os temas de exemplo que sobraram (25/11/2026:
// o GB2 de exemplo continuava no portal depois de importar só o GB1).
import { test } from "node:test";
import assert from "node:assert/strict";
import { aplicarCurriculo } from "../js/logica/tema.js";
import { cronogramaExemplo } from "../js/dados-extras.js";

const real = [{ programa: "GB1", semana: 13, aulaA: { tema: "Guarda por baixo: raspagem sit-up e kimura", tecnicas: [] }, aulaB: { tema: "Guarda por baixo: guarda aranha", tecnicas: [] } }];

test("o cronograma de exemplo tem GB1 e GB2 nas 16 semanas", () => {
  const ex = cronogramaExemplo();
  assert.equal(ex.filter(s => s.programa === "GB1").length, 16);
  assert.equal(ex.filter(s => s.programa === "GB2").length, 16);
});

test("importar: semanas do arquivo entram; todas as semanas ainda iguais ao exemplo saem (GB1 e GB2)", () => {
  const r = aplicarCurriculo(cronogramaExemplo(), real);
  assert.equal(r.length, 1);
  assert.equal(r[0].programa, "GB1");
  assert.equal(r[0].semana, 13);
  assert.equal(r[0].aulaB.tema, "Guarda por baixo: guarda aranha");
  assert.equal(r[0].id, "GB1-13");
});

test("importar: semana editada à mão (diferente do exemplo) fica", () => {
  const ex = cronogramaExemplo();
  const gb2 = ex.find(s => s.programa === "GB2" && s.semana === 5);
  gb2.aulaA = { tema: "Passagem toreando (cadastrada pela academia)", tecnicas: [] };
  const r = aplicarCurriculo(ex, real);
  assert.ok(r.some(s => s.programa === "GB2" && s.semana === 5 && s.aulaA.tema.includes("academia")));
  assert.equal(r.length, 2);
});

test("importar de novo atualiza a semana que já existe, sem duplicar", () => {
  const r1 = aplicarCurriculo([], real);
  const r2 = aplicarCurriculo(r1, [{ ...real[0], aulaA: { tema: "Novo tema", tecnicas: [] } }]);
  assert.equal(r2.length, 1);
  assert.equal(r2[0].aulaA.tema, "Novo tema");
});
