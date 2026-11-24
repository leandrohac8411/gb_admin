// Etapa 2: tudo no banco. Os dados viram "baldes" (um documento por tipo; check-ins por mês)
// e cada salvar grava só os itens que mudaram.
import { test } from "node:test";
import assert from "node:assert/strict";
import { gerarDados, COLECOES } from "../js/dados-ficticios.js";
import { chaveDe, garantirIds, paraDocs, deDocs, diferencas, semExemplos, aplicarGrade, semear } from "../js/logica/baldes.js";

const HOJE = "2026-11-24";
let n = 0;
const novoId = p => `${p}x${n++}`;
const preparado = () => { const d = gerarDados(HOJE); garantirIds(d, novoId); return d; };

test("chave: check-in vai para o balde do mês; o resto, para o balde do tipo", () => {
  assert.equal(chaveDe("checkins", { data: "2026-11-03" }), "checkins-2026-11");
  assert.equal(chaveDe("alunos", { id: "a1" }), "alunos");
});

test("garantirIds dá id para quem não tem (graduações) e não mexe em quem tem", () => {
  const d = gerarDados(HOJE);
  const id0 = d.alunos[0].id;
  garantirIds(d, novoId);
  assert.ok(d.graduacoes.every(g => typeof g.id === "string" && g.id));
  assert.equal(d.alunos[0].id, id0);
  for (const c of COLECOES) assert.equal(new Set(d[c].map(x => x.id)).size, d[c].length, `ids repetidos em ${c}`);
});

test("ida e volta: paraDocs → deDocs devolve os mesmos dados, na mesma ordem, sem config.usuario", () => {
  const d = preparado();
  d.config.usuario = { nome: "Leandro" };
  const docs = paraDocs(d);
  assert.ok(docs["checkins-2026-11"], "check-ins em balde por mês");
  assert.ok(!JSON.stringify(docs).includes('"usuario"'));
  const { dados } = deDocs(docs);
  for (const c of COLECOES) assert.deepEqual(dados[c], d[c], c);
  const { usuario, ...cfg } = d.config;
  assert.deepEqual(dados.config, cfg);
});

test("baldes cabem no limite do Firestore (1 MiB por documento) e são poucos", () => {
  const docs = paraDocs(preparado());
  for (const [id, doc] of Object.entries(docs)) assert.ok(JSON.stringify(doc).length < 900_000, id);
  assert.ok(Object.keys(docs).length <= 40, `${Object.keys(docs).length} documentos por abertura`);
});

test("diferencas: sem mudança não grava nada", () => {
  const { dados, base } = deDocs(paraDocs(preparado()));
  assert.equal(diferencas(base, dados, () => 1).escritas.length, 0);
});

test("diferencas: editar um campo grava só aquele item", () => {
  const { dados, base } = deDocs(paraDocs(preparado()));
  dados.mensalidades[3].pagoEm = HOJE;
  const { escritas } = diferencas(base, dados, () => 1);
  assert.equal(escritas.length, 1);
  assert.equal(escritas[0].doc, "mensalidades");
  assert.deepEqual(Object.keys(escritas[0].itens), [dados.mensalidades[3].id]);
  assert.equal(escritas[0].itens[dados.mensalidades[3].id].pagoEm, HOJE);
});

test("diferencas: item novo entra no fim; excluído vira null; sem id ganha id", () => {
  const { dados, base } = deDocs(paraDocs(preparado()));
  const saiu = dados.despesas[0].id;
  dados.despesas.shift();
  dados.graduacoes.push({ alunoId: dados.alunos[0].id, data: HOJE, faixa: "azul", graus: 0 });
  const r = diferencas(base, dados, () => 999, novoId);
  const desp = r.escritas.find(e => e.doc === "despesas"), grad = r.escritas.find(e => e.doc === "graduacoes");
  assert.equal(desp.itens[saiu], null);
  const [idG] = Object.keys(grad.itens);
  assert.ok(idG && dados.graduacoes.at(-1).id === idG);
  assert.equal(grad.itens[idG]._o, 999);
  // Depois de gravar, a nova base já inclui a mudança: salvar de novo não grava nada.
  assert.equal(diferencas(r.base, dados, () => 1).escritas.length, 0);
});

test("diferencas: check-in que muda de mês sai de um balde e entra no outro", () => {
  const { dados, base } = deDocs(paraDocs(preparado()));
  const c = dados.checkins.find(x => x.data.startsWith("2026-11"));
  c.data = "2026-10-30";
  const { escritas } = diferencas(base, dados, () => 1);
  assert.equal(escritas.find(e => e.doc === "checkins-2026-11").itens[c.id], null);
  assert.equal(escritas.find(e => e.doc === "checkins-2026-10").itens[c.id].data, "2026-10-30");
});

test("diferencas: mudar a configuração grava o documento config (sem o usuário logado)", () => {
  const { dados, base } = deDocs(paraDocs(preparado()));
  dados.config.usuario = { nome: "Stephany" };
  assert.equal(diferencas(base, dados, () => 1).escritas.length, 0, "trocar só o usuário não grava");
  dados.config.nomeAcademia = "GB Sobradinho";
  const { escritas } = diferencas(base, dados, () => 1);
  assert.equal(escritas[0].doc, "config");
  assert.equal(escritas[0].valor.nomeAcademia, "GB Sobradinho");
  assert.ok(!("usuario" in escritas[0].valor));
});

test("diferencas: undefined não vai para o banco (o Firestore recusa)", () => {
  const { dados, base } = deDocs(paraDocs(preparado()));
  dados.alunos[0].peso = undefined;
  const { escritas } = diferencas(base, dados, () => 1);
  assert.ok(!("peso" in escritas[0].itens[dados.alunos[0].id]));
});

test("semear: fictícios marcados como exemplo; reais antigos entram com o mesmo id", () => {
  const reais = {
    alunos: [{ id: "R1", nome: "Aluno Real", faixa: "azul", graus: 1, categoria: "adulto", status: "ativo", desde: "2025-01-01", desdeFaixa: "2025-01-01", ultimaGraduacao: "2025-01-01", real: true }],
    turmas: [{ id: "d-1-1900", diaSemana: 1, horario: "19:00", programa: "GB1", professor: "Prof Real", duracaoMin: 60, categoria: "adulto" }],
    checkins: [{ id: "C1", alunoId: "R1", turmaId: "d-1-1900", data: "2026-11-23", hora: "19:00", origem: "manual" }]
  };
  const d = semear(gerarDados(HOJE), reais, novoId);
  assert.ok(d.alunos.find(a => a.id === "R1").real);
  assert.ok(!d.alunos.find(a => a.id === "R1").exemplo);
  assert.ok(d.alunos.filter(a => a.id !== "R1").every(a => a.exemplo === true));
  assert.ok(d.checkins.some(c => c.id === "C1"));
  assert.ok(d.turmas.some(t => t.id === "d-1-1900" && t.real));
  assert.ok(!d.turmas.some(t => t.categoria === "adulto" && t.exemplo), "grade real adulta substitui a de exemplo");
  assert.ok(!("rostos" in d) && !("_turmasFicticiasAdultas" in d));
  assert.ok(d.graduacoes.every(g => g.id));
});

test("aplicarGrade: importa com id fixo, cria professor e tira as adultas de exemplo", () => {
  const d = preparado();
  for (const c of COLECOES) d[c].forEach(x => { x.exemplo = true; });
  const t = { diaSemana: 2, horario: "06:30", programa: "GB2", professor: "Prof Novo", duracaoMin: 60, categoria: "adulto" };
  aplicarGrade(d, [t]);
  aplicarGrade(d, [{ ...t, programa: "GB1" }]); // importar de novo atualiza, não duplica
  const reais = d.turmas.filter(x => x.real);
  assert.equal(reais.length, 1);
  assert.equal(reais[0].id, "d-2-0630");
  assert.equal(reais[0].programa, "GB1");
  assert.ok(d.professores.some(p => p.id === reais[0].professorId && p.nome === "Prof Novo"));
  assert.ok(!d.turmas.some(x => x.categoria === "adulto" && x.exemplo));
  assert.ok(d.turmas.some(x => x.categoria === "kids"), "kids de exemplo continuam");
});

test("semExemplos: tira alunos de exemplo e o que é deles; mantém catálogo e o que é real", () => {
  const d = semear(gerarDados(HOJE), { alunos: [{ id: "R1", nome: "Real", faixa: "branca", graus: 0, categoria: "adulto", status: "ativo", desde: HOJE, desdeFaixa: HOJE, ultimaGraduacao: HOJE, real: true }] }, novoId);
  d.mensalidades.push({ id: "mR", alunoId: "R1", competencia: "2026-11", vencimento: HOJE, valor: 1, pagoEm: null });
  d.eventos.push({ id: "eR", titulo: "Real", data: HOJE, hora: "10:00", vagas: 5, inscritos: ["R1", d.alunos[0].id] });
  const r = semExemplos(d);
  assert.deepEqual(r.alunos.map(a => a.id), ["R1"]);
  assert.deepEqual(r.mensalidades.map(m => m.id), ["mR"]);
  assert.deepEqual(r.eventos.map(e => e.id), ["eR"]);
  assert.deepEqual(r.eventos[0].inscritos, ["R1"]);
  for (const c of ["checkins", "graduacoes", "avaliacoes", "contratos", "prospects", "despesas", "comunicacoes", "acompanhamentos"])
    assert.ok(r[c].every(x => !x.exemplo && (!x.alunoId || x.alunoId === "R1")), c);
  for (const c of ["planos", "produtos", "modelosAula", "habilidades", "modelosDoc", "modelosMsg", "perfis", "usuarios", "cronograma", "professores", "turmas"])
    assert.equal(r[c].length, d[c].length, `${c} fica`);
});

import { semAlunos } from "../js/logica/baldes.js";
test("semAlunos: excluir aluno tira ele e tudo que é dele (presenças, mensalidades, inscrições)", () => {
  const d = preparado();
  const alvo = d.alunos.find(a => d.checkins.some(c => c.alunoId === a.id) && d.mensalidades.some(m => m.alunoId === a.id));
  d.eventos[0].inscritos.push(alvo.id);
  const r = semAlunos(d, [alvo.id]);
  assert.ok(!r.alunos.some(a => a.id === alvo.id));
  assert.equal(r.alunos.length, d.alunos.length - 1);
  assert.ok(!JSON.stringify(r).includes(`"${alvo.id}"`));
  assert.equal(r.planos.length, d.planos.length);
});

test("nada que o Firestore recusa: lista dentro de lista, chave vazia ou __reservada__", () => {
  const probs = [];
  const ver = (x, dentroLista) => {
    if (Array.isArray(x)) { if (dentroLista) probs.push("lista em lista"); x.forEach(v => ver(v, true)); return; }
    if (x && typeof x === "object") for (const [k, v] of Object.entries(x)) { if (k === "" || /^__.*__$/.test(k)) probs.push(k); ver(v, false); }
  };
  ver(paraDocs(preparado()), false);
  assert.deepEqual(probs, []);
});
