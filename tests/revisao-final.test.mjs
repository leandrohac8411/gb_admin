// Achados da revisão final da etapa 1 (ver ledger). Cada teste reproduz um achado.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mesclar, paraLocal, salvarComAviso, comPrazo } from "../js/logica/mesclar.js";
import { guardarFotoDaAula } from "../js/logica/validar-nuvem.js";
import { criarSincronia } from "../js/logica/sincronia.js";
import { gerarDados } from "../js/dados-ficticios.js";

const reais = () => ({
  alunos: [{ id: "R1", nome: "Aluno Real Teste", faixa: "azul", graus: 0, categoria: "kids", status: "ativo", desde: "2025-01-01", desdeFaixa: "2025-01-01", ultimaGraduacao: "2025-01-01", real: true }],
  rostos: [{ id: "R1", d0: Array(128).fill(0.01), consentimento: { por: "Pai", responsavel: true, data: "2026-11-23" } }],
  turmas: [], checkins: []
});

test("#1 foto da aula: no modo logado nunca é guardada (nem em turma de exemplo)", () => {
  assert.equal(guardarFotoDaAula("painel", { categoria: "kids" }), false);
  assert.equal(guardarFotoDaAula("painel", { categoria: "adulto", real: true }), false);
  assert.equal(guardarFotoDaAula("demo", { categoria: "adulto" }), true);
});

test("#2 gravação sem resposta (offline) não trava: vira 'na fila' com aviso", async () => {
  const nunca = new Promise(() => {});
  assert.equal(await comPrazo(nunca, 20), "fila");
  assert.equal(await comPrazo(Promise.resolve(1), 20), "ok");
  const avisos = [];
  const ok = await salvarComAviso(nunca, "Salvo", t => avisos.push(t), 20);
  assert.equal(ok, true);
  assert.match(avisos[0], /quando a internet voltar/);
});

test("#5 dados ligados a aluno real (graduação, anotação, mensalidade, inscrição) não ficam no navegador", () => {
  const d = mesclar(gerarDados("2026-11-20"), reais());
  d.graduacoes.push({ alunoId: "R1", data: "2026-11-20", faixa: "cinza", graus: 1 });
  d.acompanhamentos.push({ id: "acx", alunoId: "R1", data: "2026-11-20", tipo: "Técnico", texto: "anotação sobre aluno real" });
  d.mensalidades.push({ id: "mx", alunoId: "R1", competencia: "2026-11", vencimento: "2026-11-10", valor: 1, pagoEm: null });
  d.checkins.push({ id: "cx", alunoId: "R1", turmaId: "1-1230", data: "2026-11-20", hora: "12:30" });
  d.eventos[0].inscritos.push("R1");
  const texto = JSON.stringify(paraLocal(d));
  assert.ok(!texto.includes('"R1"'), "nenhuma referência ao aluno real");
  assert.ok(!texto.includes("anotação sobre aluno real"));
  assert.ok(d.eventos[0].inscritos.includes("R1"), "não altera o original");
});

test("#4/#7 sincronia: aviso da nuvem só troca os dados sem janela aberta; restaurar remescla", () => {
  const store = { dados: gerarDados("2026-11-20") };
  let folha = true, desenhos = 0;
  const s = criarSincronia(store, { haFolhaAberta: () => folha, desenhar: () => desenhos++, agendar: () => {} });
  const antes = store.dados;
  s.receber(reais());
  assert.equal(store.dados, antes, "com janela aberta, não troca o objeto");
  assert.equal(desenhos, 0);
  folha = false; s.tentar();
  assert.ok(store.dados.alunos.some(a => a.id === "R1"));
  assert.equal(desenhos, 1);
  store.dados = gerarDados("2026-11-20"); // "Restaurar dados de exemplo"
  s.reaplicar();
  assert.ok(store.dados.alunos.some(a => a.id === "R1"), "alunos reais voltam depois de restaurar");
});
