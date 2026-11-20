// Cria o store, registra as telas prontas e desenha a rota atual.
import { registrar, desenhar, definirStore, quandoRestaurar } from "../app.js";
import { criarStore } from "../store.js";
import { hojeISO } from "../logica/datas.js";
import { perguntar, toast } from "../ui/util.js";

const store = criarStore(hojeISO());
store.salvar();
definirStore(store);

quandoRestaurar(async () => {
  if (!await perguntar("Restaurar dados de exemplo?", "Tudo o que foi cadastrado ou alterado aqui volta para a academia de exemplo.", "Restaurar", "Cancelar")) return;
  store.restaurar();
  desenhar();
  toast("Dados de exemplo restaurados");
});

const TELAS = [["dashboard", "./dashboard.js"]];
for (const [rota, caminho] of TELAS) registrar(rota, (await import(caminho)).default);

desenhar();
