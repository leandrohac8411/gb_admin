// Liga o store ao banco (etapa 2). O store.salvar() de sempre passa a gravar no Firestore só o que mudou.
// Nada é gravado antes da 1ª leitura do banco: sem ela, o fictício recém-gerado sobrescreveria tudo.
import { deDocs, diferencas, canonico } from "./baldes.js";

const LIMITE_DOC = 900_000; // o Firestore aceita até 1 MiB por documento

const assinatura = (base, rostos) => {
  const docs = Object.keys(base.itens).filter(d => Object.keys(base.itens[d]).length).sort();
  return docs.map(d => d + ":" + Object.keys(base.itens[d]).sort().map(id => `${id}=${base.itens[d][id].o}|${base.itens[d][id].j}`).join(",")).join(";")
    + "#" + base.config + "#" + rostos;
};
const assinaturaRostos = rostos => canonico([...(rostos || [])].sort((a, b) => (a.id < b.id ? -1 : 1)));
const mapaRostos = rostos => new Map((rostos || []).map(r => [r.id, {
  descritores: ["d0", "d1", "d2"].map(k => r[k]).filter(Array.isArray), mini: r.mini || null, consentimento: r.consentimento
}]));

export function ligarStoreAoBanco(store, { gravar, avisar, usuario }) {
  store.base = null;
  let atual = null, rostosSig = "";
  const ctl = {
    aplicar({ docs, rostos }) {
      const { dados, base } = deDocs(docs);
      dados.rostos = mapaRostos(rostos);
      dados.config.usuario = { ...(dados.config.usuario || {}), ...usuario };
      store.dados = dados; store.base = base;
      rostosSig = assinaturaRostos(rostos);
      atual = assinatura(base, rostosSig);
    },
    // false quando a leitura é igual ao que a tela já mostra (por exemplo, o eco da própria gravação).
    mudou({ docs, rostos }) {
      if (atual == null) return true;
      return assinatura(deDocs(docs).base, assinaturaRostos(rostos)) !== atual;
    }
  };
  store.salvar = () => {
    if (!store.base) return false;
    const existentes = new Set(Object.keys(store.base.itens));
    const { escritas, base } = diferencas(store.base, store.dados, Date.now, store.novoId);
    if (!escritas.length) return true;
    const grande = escritas.find(e => e.itens && Object.values(base.itens[e.doc] || {}).reduce((s, v) => s + v.j.length + 40, 0) > LIMITE_DOC);
    if (grande) { avisar(`Não salvou: os dados de "${grande.doc}" ficaram grandes demais para o banco.`); return false; }
    store.base = base;
    atual = assinatura(base, rostosSig);
    store.gravando = gravar(escritas, existentes);
    return true;
  };
  return ctl;
}
