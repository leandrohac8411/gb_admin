import { test } from "node:test";
import assert from "node:assert/strict";
import { rotina, linhaDoTempo } from "../js/logica/rotina.js";
import { gerarDados } from "../js/dados-ficticios.js";
import { diaSemana, segundaDaSemana, somarDias } from "../js/logica/datas.js";

const H = "2026-11-20"; // sexta

test("rotina tem hoje, semana e mês com contador coerente", () => {
  const d = gerarDados(H), r = rotina(d, H);
  assert.deepEqual(r.map(t => t.quando), ["Hoje", "Esta semana", "Esta semana", "Este mês"]);
  for (const t of r) {
    assert.ok(t.feitas >= 0 && t.feitas <= t.total, t.id);
    assert.equal(t.ok, t.total > 0 && t.feitas >= t.total);
    assert.equal(t.vazio, t.total === 0);
  }
  assert.equal(r[0].total, d.turmas.filter(t => t.diaSemana === diaSemana(H)).length);
});

test("presenças: lançar um check-in conta a aula como feita", () => {
  const d = gerarDados(H);
  const t = d.turmas.find(x => x.diaSemana === diaSemana(H));
  d.checkins = d.checkins.filter(c => c.data !== H);
  assert.equal(rotina(d, H)[0].feitas, 0);
  d.checkins.push({ id: "x", alunoId: d.alunos[0].id, turmaId: t.id, data: H, hora: t.horario });
  assert.equal(rotina(d, H)[0].feitas, 1);
});

test("dia sem aula não aparece como feito", () => {
  const dom = "2026-11-22", d = gerarDados(dom), r = rotina(d, dom);
  if (!d.turmas.some(t => t.diaSemana === 0)) { assert.equal(r[0].vazio, true); assert.equal(r[0].ok, false); }
  assert.ok(r[1].total > 0, "de segunda a sábado houve aulas");
});

test("semana: só aulas de segunda até ontem", () => {
  const d = gerarDados(H), seg = segundaDaSemana(H);
  let esperado = 0;
  for (let dia = seg; dia < H; dia = somarDias(dia, 1)) esperado += d.turmas.filter(t => t.diaSemana === diaSemana(dia)).length;
  assert.equal(rotina(d, H)[1].total, esperado);
});

test("sumidos: anotação nesta semana conta como contato feito", () => {
  const d = gerarDados(H), r = rotina(d, H)[2];
  assert.ok(r.total > 0);
  const antes = r.feitas;
  const ultimo = {};
  for (const c of d.checkins) if (c.data <= H && (!ultimo[c.alunoId] || c.data > ultimo[c.alunoId])) ultimo[c.alunoId] = c.data;
  const alvo = d.alunos.find(a => a.status === "ativo" && (ultimo[a.id] || a.desde) <= somarDias(H, -14) && !d.acompanhamentos.some(x => x.alunoId === a.id && x.data >= segundaDaSemana(H)));
  d.acompanhamentos.push({ id: "n", alunoId: alvo.id, data: H, tipo: "Contato", texto: "liguei" });
  assert.equal(rotina(d, H)[2].feitas, antes + 1);
});

test("avaliações: avaliar um kid sobe o contador", () => {
  const d = gerarDados(H);
  d.avaliacoes = [];
  assert.equal(rotina(d, H)[3].feitas, 0);
  const kid = d.alunos.find(a => a.status === "ativo" && a.categoria === "kids");
  d.avaliacoes.push({ id: "v", alunoId: kid.id, mes: "2026-11", notas: { respeito: 4, disciplina: 4, atencao: 4, coleguismo: 4 } });
  assert.equal(rotina(d, H)[3].feitas, 1);
});

test("linha do tempo: mais recente primeiro, nada no futuro, filtro por tipo", () => {
  const d = gerarDados(H), lt = linhaDoTempo(d, H);
  assert.ok(lt.length > 20);
  for (let i = 1; i < lt.length; i++) assert.ok(lt[i - 1].data >= lt[i].data);
  assert.ok(lt.every(x => x.data <= H && x.data > somarDias(H, -14)));
  const so = linhaDoTempo(d, H, { tipo: "pagamento" });
  assert.ok(so.length > 0 && so.every(x => x.tipo === "pagamento"));
  assert.ok(new Set(lt.map(x => x.tipo)).size >= 3);
});
