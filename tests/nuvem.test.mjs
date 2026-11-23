import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { alunoNuvem, rostoNuvem, checkinNuvem, turmaNuvem } from "../js/logica/validar-nuvem.js";
import { gerarDados } from "../js/dados-ficticios.js";

const XSS = '<img src=x onerror=alert(1)>';
const v = (x = 0) => Array.from({ length: 128 }, (_, k) => (k === 0 ? x : 0));
const CONS = { por: "Leandro", responsavel: true, data: "2026-11-23" };

test("alunoNuvem aceita aluno válido, só com os campos do banco, e recusa faixa falsa", () => {
  const d = gerarDados("2026-11-20");
  const a = alunoNuvem(d.alunos[0]);
  assert.equal(a.nome, d.alunos[0].nome);
  assert.equal(a.real, true);
  assert.equal(a.valor, undefined);
  assert.equal(alunoNuvem({ ...d.alunos[0], faixa: XSS }), null);
  assert.equal(alunoNuvem({ ...d.alunos[0], status: "hacker" }), null);
  assert.equal(alunoNuvem({ ...d.alunos[0], nome: "x".repeat(300) }).nome.length, 80);
  assert.equal(alunoNuvem(null), null);
});

test("rostoNuvem exige consentimento, até 3 descritores e miniatura JPEG", () => {
  assert.equal(rostoNuvem({ descritores: [v()] }), null);
  assert.equal(rostoNuvem({ descritores: [v(), v(), v(), v()], consentimento: CONS }), null);
  assert.equal(rostoNuvem({ descritores: [v()], mini: "data:text/html,<b>oi</b>", consentimento: CONS }), null);
  assert.equal(rostoNuvem({ descritores: [v()], consentimento: { ...CONS, por: "x" } }), null);
  assert.equal(rostoNuvem({ descritores: [v()], consentimento: { ...CONS, data: "ontem" } }), null);
  assert.equal(rostoNuvem({ descritores: [[1, 2]], consentimento: CONS }), null);
  const r = rostoNuvem({ descritores: [v(0.1)], mini: "data:image/jpeg;base64,AAAA", consentimento: CONS });
  assert.equal(r.d0.length, 128);
  assert.equal(r.d1, undefined);
  assert.deepEqual(r.consentimento, CONS);
  assert.equal(r.mini, "data:image/jpeg;base64,AAAA");
});

test("checkinNuvem recusa origem desconhecida", () => {
  const c = { alunoId: "a1", turmaId: "d-1-1230", data: "2026-11-23", hora: "12:30", origem: "rosto" };
  assert.deepEqual(checkinNuvem(c), c);
  assert.equal(checkinNuvem({ ...c, origem: "x" }), null);
  assert.equal(checkinNuvem({ ...c, data: "23/11" }), null);
});

test("turmaNuvem recusa horário e dia inválidos", () => {
  const t = { diaSemana: 1, horario: "12:30", programa: "GB1", professor: "Prof. X", duracaoMin: 60, categoria: "adulto" };
  assert.deepEqual(turmaNuvem(t), t);
  assert.equal(turmaNuvem({ ...t, horario: "25:00" }), null);
  assert.equal(turmaNuvem({ ...t, diaSemana: 7 }), null);
  assert.equal(turmaNuvem({ ...t, categoria: "vip" }), null);
});

test("firestore.rules usa exatamente os e-mails de USERS", async () => {
  const { USERS } = await import("../js/nuvem/config.js");
  const regras = readFileSync("firestore.rules", "utf8");
  const lista = [...regras.matchAll(/'([^']+@[^']+)'/g)].map(m => m[1]).sort();
  assert.deepEqual(lista, Object.keys(USERS).sort());
});

import { modoInicial } from "../js/logica/validar-nuvem.js";

test("modoInicial: painel com usuário autorizado, demo só local ou sem config, login no resto", () => {
  const u = { email: "leandrohacarvalho@gmail.com" };
  assert.equal(modoInicial({ configurado: true, host: "gb-admin.vercel.app", usuario: u }), "painel");
  assert.equal(modoInicial({ configurado: true, host: "gb-admin.vercel.app", usuario: null }), "login");
  assert.equal(modoInicial({ configurado: true, host: "gb-admin.vercel.app", usuario: { email: "x@y.com" } }), "login");
  assert.equal(modoInicial({ configurado: true, host: "localhost", usuario: null }), "demo");
  assert.equal(modoInicial({ configurado: true, host: "127.0.0.1", usuario: null }), "demo");
  assert.equal(modoInicial({ configurado: false, host: "gb-admin.vercel.app", usuario: null }), "demo");
  assert.equal(modoInicial({ configurado: true, host: "localhost.evil.com", usuario: null }), "login");
});
