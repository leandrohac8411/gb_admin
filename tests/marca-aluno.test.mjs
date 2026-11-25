import { test } from "node:test";
import assert from "node:assert/strict";
import { pessoa, marcaAluno } from "../js/telas/comum.js";

test("aluno real não leva etiqueta nenhuma", () => {
  assert.equal(marcaAluno({ nome: "Lucas Santana", real: true }), "");
  assert.doesNotMatch(pessoa({ nome: "Lucas Santana", real: true }), /Real|etq-/);
});

test("aluno de exemplo leva a marca discreta 'exemplo'", () => {
  assert.match(marcaAluno({ nome: "Fulano", exemplo: true }), /class="etq-exemplo"[^>]*>exemplo</);
  assert.match(pessoa({ nome: "Fulano", exemplo: true }), /etq-exemplo/);
});
