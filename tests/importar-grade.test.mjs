import { test } from "node:test";
import assert from "node:assert/strict";
import { lerGradeDiario } from "../js/logica/importar-grade.js";

// Mesma grade inicial do Diário (js/carga.js de lá), no formato que o botão de exportar gera.
const t = (diaSemana, horario) => ({ diaSemana, horario, programa: "a definir", professor: "", duracaoMin: 60 });
const GRADE_DIARIO = [
  ...[1, 3].flatMap(d => ["12:30", "19:00", "20:00"].map(h => t(d, h))),
  ...[2, 4].flatMap(d => ["07:00", "19:00", "20:00"].map(h => t(d, h))),
  t(5, "12:30"), t(5, "19:00"), t(6, "10:00")
];

const arquivo = turmas => JSON.stringify({ origem: "diario-tatame", versao: 1, turmas });

test("aceita as 15 turmas da grade inicial do Diário e troca 'a definir' por GB1+GB2", () => {
  const r = lerGradeDiario(arquivo(GRADE_DIARIO));
  assert.equal(r.turmas.length, 15);
  assert.equal(r.descartadas, 0);
  assert.ok(r.turmas.every(t => t.categoria === "adulto" && t.programa === "GB1+GB2"));
});

test("descarta turma inválida e conta quantas", () => {
  const r = lerGradeDiario(arquivo([
    { diaSemana: 1, horario: "12:30", programa: "GB1", professor: "P", duracaoMin: 60 },
    { diaSemana: 1, horario: "99:99", programa: "GB1", professor: "P", duracaoMin: 60 },
    { diaSemana: 9, horario: "10:00", programa: "GB1", professor: "P", duracaoMin: 60 }
  ]));
  assert.equal(r.turmas.length, 1);
  assert.equal(r.descartadas, 2);
});

test("recusa arquivo que não é grade do Diário, grande demais ou JSON quebrado", () => {
  assert.throws(() => lerGradeDiario(JSON.stringify({ origem: "outro", turmas: [] })), /não é uma grade do Diário/);
  assert.throws(() => lerGradeDiario("x".repeat(201 * 1024)), /não é uma grade do Diário/);
  assert.throws(() => lerGradeDiario("{quebrado"), /não é uma grade do Diário/);
  assert.throws(() => lerGradeDiario(JSON.stringify({ origem: "diario-tatame", turmas: "x" })), /não é uma grade do Diário/);
});

test("__proto__ no arquivo não polui objetos", () => {
  lerGradeDiario('{"origem":"diario-tatame","versao":1,"__proto__":{"poluido":1},"turmas":[{"diaSemana":1,"horario":"12:30","programa":"GB1","professor":"P","duracaoMin":60,"__proto__":{"x":1}}]}');
  assert.equal(({}).poluido, undefined);
  assert.equal(({}).x, undefined);
});
