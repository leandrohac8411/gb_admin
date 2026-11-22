import { test } from "node:test";
import assert from "node:assert/strict";
import { temaDaAula, lerCurriculo } from "../js/logica/tema.js";

const aula = (tema, ...tecnicas) => ({ tema, tecnicas: tecnicas.map(nome => ({ nome, categoria: "Guarda" })) });
const d = {
  config: { ancoras: [{ programa: "GB1", data: "2026-11-16", semana: 12 }, { programa: "GB2", data: "2026-11-16", semana: 12 }] },
  cronograma: [
    { programa: "GB1", semana: 12, aulaA: aula("Costas A", "Pegada de costas"), aulaB: aula("Costas B", "Mata-leão", "Relógio") },
    { programa: "GB1", semana: 13, aulaA: aula("Guarda A"), aulaB: aula("Guarda B") },
    { programa: "GB2", semana: 12, aulaA: aula("Avançado A"), aulaB: aula("Avançado B") }
  ]
};

test("segunda e terça são Aula A; quarta e quinta, Aula B", () => {
  const seg = temaDaAula(d, { programa: "GB1" }, "2026-11-16");
  assert.deepEqual(seg.map(x => [x.programa, x.semana, x.aula, x.tema]), [["GB1", 12, "A", "Costas A"]]);
  assert.deepEqual(seg[0].tecnicas.map(t => t.nome), ["Pegada de costas"]);
  assert.equal(temaDaAula(d, { programa: "GB1" }, "2026-11-19")[0].aula, "B");
  assert.equal(temaDaAula(d, { programa: "GB1" }, "2026-11-23")[0].tema, "Guarda A");
});

test("sexta e sábado mostram A e B (revisão); turma mista mostra os dois currículos", () => {
  assert.deepEqual(temaDaAula(d, { programa: "GB1" }, "2026-11-20").map(x => x.aula), ["A", "B"]);
  assert.deepEqual(temaDaAula(d, { programa: "GB1+GB2" }, "2026-11-18").map(x => `${x.programa}${x.aula}`), ["GB1B", "GB2B"]);
  assert.deepEqual(temaDaAula(d, { programa: "Kids" }, "2026-11-18"), []);
});

test("turma com aula fixa usa a aula da turma", () => {
  assert.equal(temaDaAula(d, { programa: "GB1", aula: "B" }, "2026-11-16")[0].aula, "B");
});

test("importa o JSON do Diário e recusa formato errado", () => {
  const ok = lerCurriculo(JSON.stringify([{ programa: "GB1", semana: 1, aulaA: { tema: "T1", tecnicas: [{ nome: "X", categoria: "Guarda" }] }, aulaB: { tema: "T2", tecnicas: [] } }]));
  assert.equal(ok.length, 1);
  assert.equal(ok[0].aulaA.tecnicas[0].nome, "X");
  assert.throws(() => lerCurriculo("{}"), /lista/);
  assert.throws(() => lerCurriculo(JSON.stringify([{ programa: "GB9", semana: 1 }])), /GB1 ou GB2/);
  assert.throws(() => lerCurriculo(JSON.stringify([{ programa: "GB1", semana: 30, aulaA: { tema: "x" } }])), /1 a 16/);
  assert.throws(() => lerCurriculo("não é json"), /JSON/);
});

test("no domingo a semana de referência já é a que começa amanhã", async () => {
  const { diaDeReferencia } = await import("../js/logica/tema.js");
  assert.equal(diaDeReferencia("2026-11-22"), "2026-11-23");   // domingo → segunda
  assert.equal(diaDeReferencia("2026-11-21"), "2026-11-21");   // sábado continua
  assert.equal(diaDeReferencia("2026-11-16"), "2026-11-16");
});
