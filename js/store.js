// Guarda a academia fictícia no navegador. Se não houver localStorage (ou ele falhar),
// o painel funciona só em memória.
import { gerarDados, VERSAO, COLECOES } from "./dados-ficticios.js";

const CHAVE = `gb-admin:v${VERSAO}`;

// Dados de outro mês são refeitos: a vitrine sempre mostra o mês atual "vivo".
function ler(armazenamento, hojeISO) {
  try {
    const bruto = armazenamento?.getItem(CHAVE);
    if (!bruto) return null;
    const d = JSON.parse(bruto);
    return d && d.versao === VERSAO && COLECOES.every(c => Array.isArray(d[c])) && d.config && typeof d.config === "object" && String(d.geradoEm || "").slice(0, 7) === hojeISO.slice(0, 7) ? d : null;
  } catch { return null; }
}

export function criarStore(hojeISO, armazenamento = globalThis.localStorage) {
  let contador = 0;
  // Versões antigas da vitrine não servem mais: limpa para não ocupar espaço.
  try { for (let v = 1; v < VERSAO; v++) armazenamento?.removeItem?.(`gb-admin:v${v}`); } catch { /* ignora */ }
  const store = {
    dados: ler(armazenamento, hojeISO) || gerarDados(hojeISO),
    salvar() {
      try { armazenamento?.setItem(CHAVE, JSON.stringify(store.dados)); } catch { /* sem espaço ou bloqueado: segue em memória */ }
    },
    restaurar(hoje = hojeISO) {
      store.dados = gerarDados(hoje);
      store.salvar();
    },
    novoId(prefixo) {
      return `${prefixo}${Date.now().toString(36)}${(contador++).toString(36)}`;
    }
  };
  return store;
}
