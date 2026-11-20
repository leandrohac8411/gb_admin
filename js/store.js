// Guarda a academia fictícia no navegador. Se não houver localStorage (ou ele falhar),
// o painel funciona só em memória.
import { gerarDados, VERSAO } from "./dados-ficticios.js";

const CHAVE = "gb-admin:v1";

function ler(armazenamento) {
  try {
    const bruto = armazenamento?.getItem(CHAVE);
    if (!bruto) return null;
    const d = JSON.parse(bruto);
    return d && d.versao === VERSAO && Array.isArray(d.alunos) ? d : null;
  } catch { return null; }
}

export function criarStore(hojeISO, armazenamento = globalThis.localStorage) {
  let contador = 0;
  const store = {
    dados: ler(armazenamento) || gerarDados(hojeISO),
    salvar() {
      try { armazenamento?.setItem(CHAVE, JSON.stringify(store.dados)); } catch { /* sem espaço ou bloqueado: segue em memória */ }
    },
    restaurar() {
      store.dados = gerarDados(hojeISO);
      store.salvar();
    },
    novoId(prefixo) {
      return `${prefixo}${Date.now().toString(36)}${(contador++).toString(36)}`;
    }
  };
  return store;
}
