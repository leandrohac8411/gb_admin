// Portal do aluno: mensagens do login em português.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mensagemDeErroLogin } from "../js/logica/portal-aluno.js";

test("mensagemDeErroLogin: em português, com padrão para o resto", () => {
  assert.equal(mensagemDeErroLogin("auth/invalid-credential"), "E-mail ou senha incorretos.");
  assert.equal(mensagemDeErroLogin("auth/email-already-in-use"), "Esse e-mail já tem conta. Toque em Entrar ou em Esqueci a senha.");
  assert.equal(mensagemDeErroLogin("auth/weak-password"), "A senha precisa ter pelo menos 8 caracteres.");
  assert.equal(mensagemDeErroLogin("auth/password-does-not-meet-requirements"), "A senha precisa ter pelo menos 8 caracteres.");
  assert.equal(mensagemDeErroLogin("auth/too-many-requests"), "Muitas tentativas. Espere um pouco e tente de novo.");
  assert.equal(mensagemDeErroLogin("auth/network-request-failed"), "Sem internet. Confira a conexão e tente de novo.");
  assert.equal(mensagemDeErroLogin("auth/qualquer"), "Não deu para entrar. Tente de novo.");
});
