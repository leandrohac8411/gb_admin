import { test } from "node:test";
import assert from "node:assert/strict";
import { temaDaAula } from "../js/logica/tema.js";

const d = {
  config: { ancoras: [{ programa: "GB1", data: "2026-11-16", semana: 12 }, { programa: "GB2", data: "2026-11-16", semana: 12 }] },
  cronograma: [
    { programa: "GB1", semana: 12, categoria: "Finalização", tema: "Triângulo e omoplata" },
    { programa: "GB1", semana: 13, categoria: "Costas", tema: "Estrangulamento com a gola" },
    { programa: "GB2", semana: 12, categoria: "Finalização", tema: "Triângulo avançado" }
  ]
};

test("tema do GB1 na semana do ciclo", () => {
  assert.deepEqual(temaDaAula(d, { programa: "GB1" }, "2026-11-18"), [{ programa: "GB1", semana: 12, categoria: "Finalização", tema: "Triângulo e omoplata" }]);
  assert.equal(temaDaAula(d, { programa: "GB1" }, "2026-11-23")[0].semana, 13);
});

test("turma mista mostra os dois; kids e sem cronograma não mostram", () => {
  assert.deepEqual(temaDaAula(d, { programa: "GB1+GB2" }, "2026-11-18").map(t => t.programa), ["GB1", "GB2"]);
  assert.deepEqual(temaDaAula(d, { programa: "Kids" }, "2026-11-18"), []);
  assert.deepEqual(temaDaAula({ config: d.config, cronograma: [] }, { programa: "GB1" }, "2026-11-18"), []);
});
