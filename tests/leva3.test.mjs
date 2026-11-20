import { test } from "node:test";
import assert from "node:assert/strict";
import { fluxoDoMes, CATEGORIAS_DESPESA } from "../js/logica/caixa.js";
import { irmaos, valorComDesconto, mediaComportamento, CRITERIOS } from "../js/logica/familia.js";
import { validarDados } from "../js/store.js";
import { gerarDados } from "../js/dados-ficticios.js";

const H = "2026-11-20";

test("fluxo de caixa do mês", () => {
  const d = {
    mensalidades: [
      { valor: 280, pagoEm: "2026-11-05" }, { valor: 220, pagoEm: "2026-10-30" }, { valor: 750, pagoEm: null }, { valor: 280, pagoEm: "2026-11-19" }
    ],
    despesas: [
      { data: "2026-11-05", categoria: "Aluguel", valor: 3000, pago: true }, { data: "2026-11-10", categoria: "Contas", valor: 400, pago: false },
      { data: "2026-10-05", categoria: "Aluguel", valor: 3000, pago: true }
    ]
  };
  const r = fluxoDoMes(d, "2026-11");
  assert.equal(r.entradas, 560);
  assert.equal(r.saidas, 3400);
  assert.equal(r.saidasPagas, 3000);
  assert.equal(r.saldo, 560 - 3400);
  assert.deepEqual(r.porCategoria, [{ categoria: "Aluguel", valor: 3000 }, { categoria: "Contas", valor: 400 }]);
  assert.ok(CATEGORIAS_DESPESA.includes("Professores"));
});

test("mês sem nada dá zeros", () => {
  assert.deepEqual(fluxoDoMes({ mensalidades: [], despesas: [] }, "2026-12"), { entradas: 0, saidas: 0, saidasPagas: 0, saldo: 0, porCategoria: [] });
});

test("irmãos pelo telefone do responsável e desconto", () => {
  const alunos = [
    { id: "k1", categoria: "kids", status: "ativo", responsavel: { telefone: "(61) 99999-0000" } },
    { id: "k2", categoria: "kids", status: "ativo", responsavel: { telefone: "61999990000" } },
    { id: "k3", categoria: "kids", status: "ativo", responsavel: { telefone: "(61) 98888-1111" } },
    { id: "k4", categoria: "kids", status: "trancado", responsavel: { telefone: "(61) 99999-0000" } },
    { id: "a1", categoria: "adulto", status: "ativo", telefone: "(61) 99999-0000" }
  ];
  assert.deepEqual(irmaos(alunos[0], alunos).map(a => a.id), ["k2"]);
  assert.deepEqual(irmaos(alunos[2], alunos), []);
  assert.deepEqual(irmaos(alunos[4], alunos), []);
  assert.equal(valorComDesconto(220, 0, 10), 220);
  assert.equal(valorComDesconto(220, 1, 10), 198);
});

test("média de comportamento", () => {
  assert.deepEqual(CRITERIOS, ["respeito", "disciplina", "atencao", "coleguismo"]);
  const av = [
    { alunoId: "k1", mes: "2026-10", notas: { respeito: 5, disciplina: 4, atencao: 3, coleguismo: 4 } },
    { alunoId: "k1", mes: "2026-11", notas: { respeito: 2, disciplina: 2, atencao: 3, coleguismo: 3 } }
  ];
  assert.equal(mediaComportamento(av, "k1"), 2.5);
  assert.equal(mediaComportamento(av, "k1", "2026-10"), 4);
  assert.equal(mediaComportamento(av, "k2"), null);
});

test("validação do backup", () => {
  const d = gerarDados(H);
  assert.equal(validarDados(d), true);
  assert.equal(validarDados({ ...d, versao: 1 }), false);
  const sem = { ...d }; delete sem.eventos;
  assert.equal(validarDados(sem), false);
  assert.equal(validarDados(null), false);
});

test("dados novos de exemplo", () => {
  const d = gerarDados(H);
  assert.equal(d.versao, 6);
  assert.ok(d.despesas.some(x => x.data.startsWith("2026-11")));
  assert.ok(d.eventos.length >= 4 && d.eventos.some(e => e.tipo === "Graduação" && e.publico === "kids"));
  const kidsAtivos = d.alunos.filter(a => a.categoria === "kids" && a.status === "ativo");
  assert.ok(kidsAtivos.every(k => d.avaliacoes.some(v => v.alunoId === k.id)));
  assert.ok(kidsAtivos.filter(k => irmaos(k, d.alunos).length).length >= 4);
  assert.ok(d.alunos.filter(a => a.status === "trancado").every(a => a.trancamento?.motivo));
  assert.ok(d.prospects.filter(p => p.etapa === "experimental").every(p => p.experimental?.turmaId));
  assert.equal(d.config.descontoIrmaos, 10);
});

test("backup importado é limpo e não some na virada do mês", async () => {
  const { limparImportado, criarStore } = await import("../js/store.js");
  const d = gerarDados(H);
  d.eventos.push({ id: "x", titulo: "Ruim", data: "<img>", hora: "<b>", vagas: "9", inscritos: "nada" });
  d.avaliacoes.push({ id: "y", alunoId: "k01", mes: "2026-11", notas: { respeito: "\"><img src=x>" } });
  d.despesas.push({ id: "z", descricao: "sem data", valor: 10 });
  const limpo = limparImportado(JSON.parse(JSON.stringify(d)));
  assert.ok(!limpo.eventos.some(e => e.id === "x"));
  assert.ok(!limpo.avaliacoes.some(v => v.id === "y"));
  assert.ok(!limpo.despesas.some(x => x.id === "z"));
  assert.equal(limpo.importado, true);
  const o = {}; const mem = { getItem: k => o[k] ?? null, setItem: (k, v) => { o[k] = String(v); }, removeItem: k => { delete o[k]; } };
  const s = criarStore(H, mem); s.dados = limpo; s.dados.config.academia.nome = "Importada"; s.salvar();
  assert.equal(criarStore("2026-12-02", mem).dados.config.academia.nome, "Importada");
});
