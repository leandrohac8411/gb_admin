import { test } from "node:test";
import assert from "node:assert/strict";
import { compactar, descritorValido, reconhecer, descritoresDoRosto } from "../js/logica/reconhecimento.js";

const v = (x, i = 0) => Array.from({ length: 128 }, (_, k) => (k === i ? x : 0));

test("compactar arredonda a 4 casas e descritorValido confere formato", () => {
  const c = compactar(Float32Array.from(v(0.123456)));
  assert.equal(c[0], 0.1235); assert.equal(c.length, 128);
  assert.ok(descritorValido(c));
  assert.ok(!descritorValido(c.slice(1)) && !descritorValido([...c.slice(1), 2]) && !descritorValido([...c.slice(1), NaN]) && !descritorValido("x"));
});

test("reconhece até 0,45, dúvida até 0,55, desconhecido acima", () => {
  // Calibrado com fotos reais: pessoas diferentes chegaram a 0,49 (ver ledger da etapa 1).
  const cad = [{ alunoId: "a", descritores: [v(0)] }];
  assert.equal(reconhecer([v(0.4)], cad)[0].estado, "reconhecido");
  assert.equal(reconhecer([v(0.49)], cad)[0].estado, "duvida");
  assert.equal(reconhecer([v(0.54)], cad)[0].estado, "duvida");
  const r = reconhecer([v(0.58)], cad)[0];
  assert.equal(r.estado, "desconhecido"); assert.equal(r.alunoId, null);
});

test("usa a menor distância entre as fotos do aluno", () => {
  const cad = [{ alunoId: "a", descritores: [v(0.9, 1), v(0, 1)] }];
  assert.equal(reconhecer([v(0.1, 1)], cad)[0].estado, "reconhecido");
});

test("um aluno nunca fica com dois rostos: o mais próximo leva", () => {
  const cad = [{ alunoId: "a", descritores: [v(0)] }, { alunoId: "b", descritores: [v(0.45)] }];
  const r = reconhecer([v(0.3), v(0.1)], cad);
  assert.equal(r[1].alunoId, "a");
  assert.equal(r[0].alunoId, "b");
});

test("sem rostos ou sem cadastrados não quebra", () => {
  assert.deepEqual(reconhecer([], [{ alunoId: "a", descritores: [v(0)] }]), []);
  assert.equal(reconhecer([v(0)], [])[0].estado, "desconhecido");
});

test("descritoresDoRosto ignora campos inválidos", () => {
  assert.equal(descritoresDoRosto({ d0: v(0), d1: [1, 2], d2: v(0.1) }).length, 2);
  assert.deepEqual(descritoresDoRosto(null), []);
});

import { escolherRostoCadastro } from "../js/logica/cadastro-rosto.js";

test("cadastro: exige um rosto claro", () => {
  const r = (w, c = 0.9) => ({ x: 0, y: 0, w, h: w, confianca: c, descritor: [] });
  assert.deepEqual(escolherRostoCadastro({ rostos: [] }), { ok: false, motivo: "nenhum" });
  assert.equal(escolherRostoCadastro({ rostos: [r(100, 0.3)] }).motivo, "nenhum");
  assert.equal(escolherRostoCadastro({ rostos: [r(100), r(90)] }).motivo, "varios");
  assert.equal(escolherRostoCadastro({ rostos: [r(100), r(40)] }).rosto.w, 100);
});

import { consentimentoPadrao, recorte } from "../js/logica/cadastro-rosto.js";

test("consentimento: kids ou menor de 18 pede responsável; adulto autoriza por si", () => {
  assert.deepEqual(consentimentoPadrao({ categoria: "kids", nascimento: "2018-05-05" }, "Leandro", "2026-11-23"), { por: "Leandro", responsavel: true, data: "2026-11-23" });
  assert.equal(consentimentoPadrao({ categoria: "adulto", nascimento: "2010-01-01" }, "Leandro", "2026-11-23").responsavel, true);
  assert.deepEqual(consentimentoPadrao({ categoria: "adulto", nascimento: "1996-01-01", nome: "João Silva" }, "Leandro", "2026-11-23"), { por: "João Silva", responsavel: false, data: "2026-11-23" });
});

test("recorte: amplia o rosto com margem e não sai da imagem", () => {
  const r = recorte({ x: 100, y: 100, w: 100, h: 100 }, 1000, 800);
  assert.deepEqual(r, { x: 75, y: 75, w: 150, h: 150 });
  const borda = recorte({ x: 0, y: 760, w: 60, h: 40 }, 1000, 800);
  assert.ok(borda.x >= 0 && borda.y >= 0 && borda.x + borda.w <= 1000 && borda.y + borda.h <= 800);
});

import { cadastradosDe, escolhaInicial } from "../js/logica/reconhecimento.js";

test("cadastradosDe: só alunos ativos que existem e têm descritor", () => {
  const rostos = new Map([["a", { descritores: [v(0)] }], ["b", { descritores: [v(0)] }], ["sumiu", { descritores: [v(0)] }], ["c", { descritores: [] }]]);
  const alunos = [{ id: "a", status: "ativo" }, { id: "b", status: "trancado" }, { id: "c", status: "ativo" }];
  assert.deepEqual(cadastradosDe({ alunos, rostos }).map(x => x.alunoId), ["a"]);
  assert.deepEqual(cadastradosDe({ alunos, rostos: undefined }), []);
});

test("escolhaInicial: reconhecido vem marcado, dúvida vem escolhido mas desmarcado, desconhecido vazio", () => {
  assert.deepEqual(escolhaInicial({ estado: "reconhecido", alunoId: "a" }), { alunoId: "a", marcado: true });
  assert.deepEqual(escolhaInicial({ estado: "duvida", alunoId: "a" }), { alunoId: "a", marcado: false });
  assert.deepEqual(escolhaInicial({ estado: "desconhecido", alunoId: null }), { alunoId: "", marcado: false });
});
