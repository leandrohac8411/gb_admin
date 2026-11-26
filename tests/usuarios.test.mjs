// Saudação do painel vem do usuário que entrou (Permissões › Usuários), não de uma configuração fixa.
import { test } from "node:test";
import assert from "node:assert/strict";
import { usuarioDaSaudacao, textoSaudacao } from "../js/logica/usuarios.js";

const usuarios = [
  { id: "u1", nome: "Leandro Henrique", email: "leandrohenriqueac@gmail.com", sexo: "M", ativo: true },
  { id: "u2", nome: "Stephany Andrade", email: "strandrade@gmail.com", sexo: "F", ativo: true }
];

test("acha o usuário pelo e-mail do login (sem diferença de maiúsculas)", () => {
  assert.deepEqual(usuarioDaSaudacao(usuarios, "StrAndrade@gmail.com", { nome: "x" }), { nome: "Stephany Andrade", sexo: "F" });
});

test("sem cadastro em Permissões, usa o padrão (nome da configuração do login)", () => {
  assert.deepEqual(usuarioDaSaudacao(usuarios, "outro@x.com", { nome: "Leandro", sexo: "M" }), { nome: "Leandro", sexo: "M" });
  assert.deepEqual(usuarioDaSaudacao(null, null, null), { nome: "", sexo: "M" });
});

test("bem-vindo / bem-vinda pelo sexo, com o primeiro nome", () => {
  assert.equal(textoSaudacao({ nome: "Stephany Andrade", sexo: "F" }), "Bem-vinda, Stephany");
  assert.equal(textoSaudacao({ nome: "Leandro Henrique", sexo: "M" }), "Bem-vindo, Leandro");
  assert.equal(textoSaudacao({ nome: "", sexo: "M" }), "Bem-vindo, visitante");
});
