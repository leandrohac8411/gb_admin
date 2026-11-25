// Painel logado sem uso por 15 minutos: a sessão cai e precisa entrar de novo (pedido de 25/11/2026).
import { test } from "node:test";
import assert from "node:assert/strict";
import { LIMITE_INATIVO_MS, sessaoExpirou, vigiarInatividade } from "../js/logica/inatividade.js";

const memoria = () => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };

test("limite é de 15 minutos", () => {
  assert.equal(LIMITE_INATIVO_MS, 15 * 60_000);
});

test("sessaoExpirou: só depois do limite; sem registro não expira", () => {
  const t0 = 1_000_000;
  assert.equal(sessaoExpirou(t0, t0 + LIMITE_INATIVO_MS - 1), false);
  assert.equal(sessaoExpirou(t0, t0 + LIMITE_INATIVO_MS), true);
  assert.equal(sessaoExpirou(String(t0), t0 + LIMITE_INATIVO_MS + 5), true);
  assert.equal(sessaoExpirou(null, t0), false);
  assert.equal(sessaoExpirou("lixo", t0), false);
});

test("vigia: uso renova o prazo; parado além do limite sai uma vez e apaga o registro", () => {
  let agora = 0, saidas = 0;
  const arm = memoria();
  const v = vigiarInatividade({ armazenamento: arm, agora: () => agora, aoExpirar: () => saidas++ });
  v.marcar();
  agora = LIMITE_INATIVO_MS - 1000; v.verificar();
  assert.equal(saidas, 0);
  v.marcar();                               // mexeu no painel
  agora += LIMITE_INATIVO_MS - 1; v.verificar();
  assert.equal(saidas, 0, "o uso renovou o prazo");
  agora += 1; v.verificar(); v.verificar();
  assert.equal(saidas, 1, "sai uma vez só");
  assert.equal(arm.getItem("gb-admin:atividade"), null);
});

test("vigia: aba fechada e reaberta depois do limite já abre expirada; sem registro começa agora", () => {
  const arm = memoria();
  arm.setItem("gb-admin:atividade", 0);
  let saiu = false;
  assert.equal(vigiarInatividade({ armazenamento: arm, agora: () => LIMITE_INATIVO_MS + 1, aoExpirar: () => { saiu = true; } }).verificar(), true);
  assert.equal(saiu, true);
  const nova = memoria();
  const v = vigiarInatividade({ armazenamento: nova, agora: () => 500, aoExpirar: () => assert.fail("não deveria sair") });
  assert.equal(v.verificar(), false);
  assert.equal(nova.getItem("gb-admin:atividade"), "500");
});
