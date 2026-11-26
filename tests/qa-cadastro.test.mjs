// Bugs achados no teste manual (QA) de 25/11/2026.
import { test } from "node:test";
import assert from "node:assert/strict";
import { valorReais, telefoneValido, categoriaDoProspect, inscritosDoPublico } from "../js/logica/regras-cadastro.js";
import { valorReajustado } from "../js/logica/familia.js";

test("valor em reais: fração de centavo não passa (R$ 0,004 aparecia como R$ 0,00)", () => {
  assert.equal(valorReais("0.004", 1000), null);
  assert.equal(valorReais("10.005", 1000), null);
  assert.equal(valorReais("0", 1000), null);
  assert.equal(valorReais("-5", 1000), null);
  assert.equal(valorReais("", 1000), null);
  assert.equal(valorReais("abc", 1000), null);
  assert.equal(valorReais("1000.01", 1000), null);
  assert.equal(valorReais("0.01", 1000), 0.01);
  assert.equal(valorReais("33.33", 1000), 33.33);
  assert.equal(valorReais("33,3", 1000), 33.3);
  assert.equal(valorReais("1000", 1000), 1000);
});

test("telefone: vazio pode (é opcional); se preencher, precisa de 8 a 13 dígitos", () => {
  assert.equal(telefoneValido(""), true);
  assert.equal(telefoneValido("   "), true);
  assert.equal(telefoneValido("abc"), false);
  assert.equal(telefoneValido("1234"), false);
  assert.equal(telefoneValido("(61) 99999-0000"), true);
  assert.equal(telefoneValido("+55 61 99999-0000"), true);
  assert.equal(telefoneValido("1".repeat(14)), false);
});

test("prospect que fez experimental em turma kids é matriculado como criança", () => {
  const turmas = [{ id: "tk", categoria: "kids" }, { id: "ta", categoria: "adulto" }, { id: "tv" }];
  assert.equal(categoriaDoProspect({ experimental: { turmaId: "tk" } }, turmas), "kids");
  assert.equal(categoriaDoProspect({ experimental: { turmaId: "ta" } }, turmas), "adulto");
  assert.equal(categoriaDoProspect({ experimental: { turmaId: "tv" } }, turmas), "adulto");
  assert.equal(categoriaDoProspect({ experimental: { turmaId: "sumiu" } }, turmas), "adulto");
  assert.equal(categoriaDoProspect({}, turmas), "adulto");
});

test("trocar o público do evento diz quem sai da lista de inscritos", () => {
  const alunos = { a: { id: "a" }, b: { id: "b", categoria: "adulto" }, k: { id: "k", categoria: "kids" } };
  assert.deepEqual(inscritosDoPublico(["a", "b", "k", "x"], "kids", alunos), { ficam: ["k"], saem: ["a", "b"] });
  assert.deepEqual(inscritosDoPublico(["a", "k"], "todos", alunos), { ficam: ["a", "k"], saem: [] });
  assert.deepEqual(inscritosDoPublico(["a", "k"], "adulto", alunos), { ficam: ["a"], saem: ["k"] });
});

test("reajuste do plano mantém o desconto de irmão de quem já tinha", () => {
  const tel = { telefone: "61 90000-0001" };
  const um = { id: "k1", categoria: "kids", status: "ativo", plano: "Kids", valor: 220, responsavel: tel };
  const dois = { id: "k2", categoria: "kids", status: "ativo", plano: "Kids", valor: 198, responsavel: tel };
  const so = { id: "k3", categoria: "kids", status: "ativo", plano: "Kids", valor: 220, responsavel: { telefone: "61 1111-2222" } };
  const adulto = { id: "a1", categoria: "adulto", status: "ativo", plano: "Mensal", valor: 250 };
  const todos = [um, dois, so, adulto];
  assert.equal(valorReajustado(um, todos, 220, 230, 10), 230);
  assert.equal(valorReajustado(dois, todos, 220, 230, 10), 207);
  assert.equal(valorReajustado(so, todos, 220, 230, 10), 230);
  assert.equal(valorReajustado(adulto, todos, 280, 300, 10), 300);
});

import { valorDoAluno } from "../js/logica/regras-cadastro.js";
test("valor combinado: o dono escolhe o valor do aluno (ex.: família 220 -> 170); vazio = valor do plano", () => {
  assert.deepEqual(valorDoAluno("170", 220), { valor: 170, combinado: true });
  assert.deepEqual(valorDoAluno("", 220), { valor: 220, combinado: false });
  assert.deepEqual(valorDoAluno("220", 220), { valor: 220, combinado: false });
  assert.deepEqual(valorDoAluno("170,50", 220), { valor: 170.5, combinado: true });
  assert.equal(valorDoAluno("abc", 220), null);
  assert.equal(valorDoAluno("0", 220), null);
});

test("reajuste do plano não mexe no valor combinado com o aluno", () => {
  const fam = { id: "f1", categoria: "adulto", status: "ativo", plano: "Mensal", valor: 170, valorCombinado: true };
  assert.equal(valorReajustado(fam, [fam], 220, 240, 10), 170);
});
