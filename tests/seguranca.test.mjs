import { test } from "node:test";
import assert from "node:assert/strict";
import { limparImportado, validarDados } from "../js/store.js";
import { gerarDados } from "../js/dados-ficticios.js";
import { csv } from "../js/ui/util-admin.js";
import { nomeFaixa, faixaSVG, faixaValida } from "../js/ui/faixa.js";
import { esc, horaTexto } from "../js/ui/util.js";

const H = "2026-11-20";
const XSS = '<img src=x onerror=alert(1)>';

test("backup adulterado: alunos com faixa/status/graus falsos saem", () => {
  const d = gerarDados(H), antes = d.alunos.length;
  d.alunos[0].faixa = XSS;
  d.alunos[1].status = "hacker";
  d.alunos[2].graus = 9999;
  d.alunos[3].categoria = "vip";
  d.alunos.push(42, "lixo", null);
  const limpo = limparImportado(d);
  assert.equal(limpo.alunos.length, antes - 4);
  assert.ok(limpo.alunos.every(a => faixaValida(a.faixa) && ["ativo", "trancado"].includes(a.status)));
});

test("backup adulterado: lixo solto nas outras listas sai, professor com faixa falsa sai", () => {
  const d = gerarDados(H);
  d.prospects.push("texto", 7, null, [1]);
  d.professores.push({ id: "px", nome: "X", faixa: "dourada" });
  const limpo = limparImportado(d);
  assert.ok(limpo.prospects.every(p => p && typeof p === "object" && !Array.isArray(p)));
  assert.ok(!limpo.professores.some(p => p.id === "px"));
});

test("backup adulterado: link do Diário só https", () => {
  for (const url of ["javascript:alert(1)", "data:text/html,oi", "http://exemplo.com", 'https://x.com" onclick="alert(1)']) {
    const d = gerarDados(H); d.config.diarioUrl = url;
    assert.equal(limparImportado(d).config.diarioUrl, undefined, url);
  }
  const d = gerarDados(H); d.config.diarioUrl = "https://gracie-taupe.vercel.app";
  assert.equal(limparImportado(d).config.diarioUrl, "https://gracie-taupe.vercel.app");
});

test("JSON com __proto__ não polui objetos (o import usa reviver)", () => {
  const reviver = (k, v) => (k === "__proto__" || k === "constructor" || k === "prototype" ? undefined : v);
  const obj = JSON.parse('{"a":1,"__proto__":{"poluido":true},"constructor":{"prototype":{"p2":true}}}', reviver);
  Object.assign({}, obj);
  assert.equal(({}).poluido, undefined);
  assert.equal(({}).p2, undefined);
  assert.equal(validarDados(null), false);
});

test("faixa inválida nunca vira HTML", () => {
  assert.equal(nomeFaixa(XSS), "Faixa inválida");
  assert.ok(!faixaSVG(XSS).includes("<img"));
  assert.equal(nomeFaixa("azul"), "Azul");
  assert.equal(nomeFaixa("cinza-branca"), "Cinza e branca");
});

test("CSV: fórmula não executa, nem com espaço antes", () => {
  const saida = csv([["=1+1", " =HYPERLINK(\"x\")", "+5", "-3", "@SOMA(A1)", "normal"]]);
  assert.ok(saida.includes("'=1+1"));
  assert.ok(saida.includes("' =HYPERLINK"));
  assert.ok(saida.includes("'+5") && saida.includes("'-3") && saida.includes("'@SOMA"));
  assert.ok(saida.includes("normal"));
});

test("escape de HTML e do horário", () => {
  assert.equal(esc(`<a href="x">'&`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;");
  assert.equal(horaTexto("19:00"), "19h00");
  assert.ok(!horaTexto(XSS).includes("<"));
});
