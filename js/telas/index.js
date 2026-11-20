// Cria o store, registra as telas prontas e desenha a rota atual.
import { registrar, desenhar, definirStore, quandoRestaurar } from "../app.js";
import { criarStore } from "../store.js";
import { hojeISO } from "../logica/datas.js";
import { aplicarRegras } from "../logica/graduacao.js";
import { perguntar, toast } from "../ui/util.js";
import dashboard from "./dashboard.js";
import alunos from "./alunos.js";
import aluno from "./aluno.js";
import agenda from "./agenda.js";
import checkins from "./checkins.js";
import graduacoes from "./graduacoes.js";
import financeiro from "./financeiro.js";
import * as gestao from "./gestao.js";
import * as operacao from "./operacao.js";
import * as admin from "./admin.js";

const store = criarStore(hojeISO());
store.salvar();
aplicarRegras(store.dados.config.regras, store.dados.config.regrasKids);
definirStore(store);

quandoRestaurar(async () => {
  if (!await perguntar("Restaurar dados de exemplo?", "Tudo o que foi cadastrado ou alterado aqui volta para a academia de exemplo.", "Restaurar", "Cancelar")) return;
  store.restaurar(hojeISO());
  aplicarRegras(store.dados.config.regras, store.dados.config.regrasKids);
  desenhar();
  toast("Dados de exemplo restaurados");
});

Object.entries({ dashboard, alunos, aluno, agenda, checkins, graduacoes, financeiro,
  professores: gestao.professores, acompanhamentos: gestao.acompanhamentos, cronogramas: gestao.cronogramas,
  "modelos-aula": gestao.modelosAula, habilidades: gestao.habilidades,
  planos: operacao.planos, contratos: operacao.contratos, prospects: operacao.prospects,
  comunicacao: operacao.comunicacao, relatorios: operacao.relatorios,
  documentos: admin.documentos, mensagens: admin.mensagens, permissoes: admin.permissoes, portal: admin.portal, config: admin.config }).forEach(([rota, tela]) => registrar(rota, tela));

desenhar();
