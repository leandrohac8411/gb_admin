// Store ligado ao banco: salvar grava só a diferença; nada é gravado antes da 1ª leitura do banco.
import { test } from "node:test";
import assert from "node:assert/strict";
import { gerarDados } from "../js/dados-ficticios.js";
import { paraDocs, semear } from "../js/logica/baldes.js";
import { ligarStoreAoBanco } from "../js/logica/painel-store.js";
import { criarSincronia } from "../js/logica/sincronia.js";

const docsIniciais = () => paraDocs(semear(gerarDados("2026-11-24"), {}));
const montar = () => {
  const gravados = [], avisos = [];
  const store = { dados: null, novoId: p => `${p}n` };
  const ctl = ligarStoreAoBanco(store, { gravar: (e, existentes) => { gravados.push({ e, existentes }); return Promise.resolve(); }, avisar: t => avisos.push(t), usuario: { nome: "Stephany", sexo: "F" } });
  return { store, ctl, gravados, avisos };
};

test("antes da 1ª leitura do banco, salvar não grava (não sobrescreve o banco com fictício)", () => {
  const { store, gravados } = montar();
  store.dados = gerarDados("2026-11-24");
  assert.equal(store.salvar(), false);
  assert.equal(gravados.length, 0);
});

test("aplicar a leitura monta os dados com o usuário logado e os rostos", () => {
  const { store, ctl } = montar();
  ctl.aplicar({ docs: docsIniciais(), rostos: [{ id: "a1", d0: [1], consentimento: { por: "X" } }] });
  assert.equal(store.dados.config.usuario.nome, "Stephany");
  assert.ok(store.dados.rostos instanceof Map && store.dados.rostos.has("a1"));
  assert.ok(store.dados.alunos.length > 0);
});

test("editar e salvar grava só o item alterado, dizendo quais documentos já existem", () => {
  const { store, ctl, gravados } = montar();
  ctl.aplicar({ docs: docsIniciais(), rostos: [] });
  store.dados.alunos[0].telefone = "61 99999-0000";
  assert.equal(store.salvar(), true);
  assert.equal(gravados.length, 1);
  assert.deepEqual(gravados[0].e.map(x => x.doc), ["alunos"]);
  assert.ok(gravados[0].existentes.has("alunos"));
  assert.equal(store.salvar(), true);
  assert.equal(gravados.length, 1, "salvar de novo sem mudança não grava");
});

test("a leitura que só repete o que este aparelho gravou (eco) não redesenha", () => {
  const { store, ctl } = montar();
  const docs = docsIniciais();
  ctl.aplicar({ docs, rostos: [] });
  assert.equal(ctl.mudou({ docs, rostos: [] }), false);
  const outro = structuredClone(docs);
  const [id] = Object.keys(outro.alunos.itens);
  outro.alunos.itens[id].nome = "Mudou em outro aparelho";
  assert.equal(ctl.mudou({ docs: outro, rostos: [] }), true);
  assert.equal(ctl.mudou({ docs, rostos: [{ id: "x", d0: [1] }] }), true, "rosto novo conta como mudança");
  store.dados.alunos[0].nome = "Editado aqui"; store.salvar();
  docs.alunos.itens[store.dados.alunos[0].id] = { ...store.dados.alunos[0], _o: docs.alunos.itens[store.dados.alunos[0].id]._o };
  assert.equal(ctl.mudou({ docs, rostos: [] }), false, "eco da própria gravação");
});

test("balde grande demais: não grava e avisa", () => {
  const { store, ctl, gravados, avisos } = montar();
  ctl.aplicar({ docs: docsIniciais(), rostos: [] });
  store.dados.prospects[0].obs = "x".repeat(950_000);
  assert.equal(store.salvar(), false);
  assert.equal(gravados.length, 0);
  assert.match(avisos[0], /grande/);
});

test("sincronia: com janela aberta segura a leitura; ao fechar, aplica a mais nova", () => {
  const { store, ctl } = montar();
  let folha = true, desenhos = 0;
  const s = criarSincronia(store, { haFolhaAberta: () => folha, desenhar: () => desenhos++, agendar: () => {}, aplicar: ctl.aplicar, mudou: ctl.mudou });
  const docs = docsIniciais();
  s.receber({ docs: structuredClone(docs), rostos: [] });
  assert.equal(store.dados, null);
  folha = false; s.tentar();
  assert.ok(store.dados.alunos.length);
  assert.equal(desenhos, 1);
  s.receber({ docs: structuredClone(docs), rostos: [] });
  assert.equal(desenhos, 1, "leitura igual não redesenha");
});
