import { test } from "node:test";
import assert from "node:assert/strict";
import { desenharMenu } from "../js/menu.js";

test("menu mostra o botão de dados de exemplo quando há rótulo", () => {
  assert.match(desenharMenu("dashboard", {}, { restaurar: "Apagar dados de exemplo" }), /id="restaurar"/);
});

test("menu sem rótulo (não há mais dados de exemplo) não mostra o botão", () => {
  assert.doesNotMatch(desenharMenu("dashboard", {}, { restaurar: "" }), /id="restaurar"/);
});
