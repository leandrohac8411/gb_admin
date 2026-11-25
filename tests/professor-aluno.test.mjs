// Professor que treina: no cadastro dele, marcar "Também treina" já o deixa como aluno (25/11/2026).
import { test } from "node:test";
import assert from "node:assert/strict";
import { professorTreina } from "../js/logica/professor-aluno.js";

const base = () => ({
  alunos: [{ id: "a1", nome: "Ana Souza", status: "ativo", categoria: "adulto", faixa: "azul", graus: 1 }],
  professores: [{ id: "p1", nome: "Fernando Correa", faixa: "preta", graus: 3 }, { id: "p2", nome: "Ana Souza", faixa: "preta", graus: 0 }],
  mensalidades: [], contratos: []
});
let n = 0;
const opc = { hoje: "2026-11-25", novoId: p => `${p}${++n}`, real: true };

test("marcar 'treina' cria a ficha de aluno com nome, faixa e graus do professor, sem mensalidade", () => {
  const d = base(), p = d.professores[0];
  const r = professorTreina(d, p, true, opc);
  assert.equal(r.criado, true);
  const a = d.alunos.find(x => x.id === p.alunoId);
  assert.ok(a, "professor ficou ligado a uma ficha");
  assert.deepEqual({ nome: a.nome, faixa: a.faixa, graus: a.graus, status: a.status, categoria: a.categoria, plano: a.plano, valor: a.valor, real: a.real },
    { nome: "Fernando Correa", faixa: "preta", graus: 3, status: "ativo", categoria: "adulto", plano: "Professor", valor: 0, real: true });
  assert.equal(a.desde, "2026-11-25");
  assert.equal(d.mensalidades.length, 0);
  assert.equal(d.contratos.length, 0);
});

test("se já existe aluno com o mesmo nome, liga a ele em vez de duplicar", () => {
  const d = base(), p = d.professores[1];
  const r = professorTreina(d, p, true, opc);
  assert.equal(r.criado, false);
  assert.equal(p.alunoId, "a1");
  assert.equal(d.alunos.length, 1);
});

test("salvar de novo com 'treina' acompanha nome, faixa e graus; desmarcar sem treino tira a ficha", () => {
  const d = base(), p = d.professores[0];
  professorTreina(d, p, true, opc);
  const id = p.alunoId;
  Object.assign(p, { nome: "Fernando C. Correa", graus: 4 });
  professorTreina(d, p, true, opc);
  const a = d.alunos.find(x => x.id === id);
  assert.equal(p.alunoId, id);
  assert.equal(a.nome, "Fernando C. Correa");
  assert.equal(a.graus, 4);
  professorTreina(d, p, false, opc);
  assert.equal(p.alunoId, "");
  assert.ok(!d.alunos.some(x => x.id === id), "ficha sem nenhum treino some: ele fica só como professor");
});

test("desmarcar com histórico tranca a ficha (some das listas, os treinos ficam); marcar de novo reativa", () => {
  const d = { ...base(), checkins: [], graduacoes: [] }, p = d.professores[0];
  professorTreina(d, p, true, opc);
  const id = p.alunoId;
  d.checkins.push({ alunoId: id, turmaId: "t1", data: "2026-11-20", hora: "12:30" });
  professorTreina(d, p, false, { ...opc, hoje: "2026-11-26" });
  const a = d.alunos.find(x => x.id === id);
  assert.equal(a.status, "trancado");
  assert.deepEqual(a.trancamento, { data: "2026-11-26", motivo: "Professor que não treina", obs: "" });
  professorTreina(d, p, true, opc);
  assert.equal(p.alunoId, id, "volta para a mesma ficha");
  assert.equal(a.status, "ativo");
  assert.equal(a.trancamento, undefined);
});

test("ficha trancada volta a ficar ativa quando o professor volta a treinar", () => {
  const d = base(), p = d.professores[1];
  d.alunos[0].status = "trancado";
  professorTreina(d, p, true, opc);
  assert.equal(d.alunos[0].status, "ativo");
});
