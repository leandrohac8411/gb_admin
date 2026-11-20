// Cria o store, registra as telas prontas e desenha a rota atual.
import { registrar, desenhar, definirStore, quandoRestaurar } from "../app.js";
import { criarStore } from "../store.js";
import { hojeISO } from "../logica/datas.js";
import { perguntar, toast } from "../ui/util.js";
import dashboard from "./dashboard.js";
import alunos from "./alunos.js";
import aluno from "./aluno.js";
import agenda from "./agenda.js";
import checkins from "./checkins.js";
import graduacoes from "./graduacoes.js";
import financeiro from "./financeiro.js";

const store = criarStore(hojeISO());
store.salvar();
definirStore(store);

quandoRestaurar(async () => {
  if (!await perguntar("Restaurar dados de exemplo?", "Tudo o que foi cadastrado ou alterado aqui volta para a academia de exemplo.", "Restaurar", "Cancelar")) return;
  store.restaurar();
  desenhar();
  toast("Dados de exemplo restaurados");
});

Object.entries({ dashboard, alunos, aluno, agenda, checkins, graduacoes, financeiro }).forEach(([rota, tela]) => registrar(rota, tela));

desenhar();
