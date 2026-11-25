// Painel logado parado por 15 minutos: a sessão cai e precisa entrar de novo (ninguém marca
// mensalidade como paga num computador esquecido aberto). O último uso fica no navegador,
// então vale também para aba fechada e reaberta, computador que dormiu e outras abas.
export const LIMITE_INATIVO_MS = 15 * 60_000;
const CHAVE = "gb-admin:atividade";

export function sessaoExpirou(ultima, agora, limite = LIMITE_INATIVO_MS) {
  if (ultima == null) return false;
  const t = Number(ultima);
  return Number.isFinite(t) && agora - t >= limite;
}

export function vigiarInatividade({ armazenamento = globalThis.localStorage, agora = Date.now, limite = LIMITE_INATIVO_MS, aoExpirar }) {
  let saiu = false;
  const ler = () => { try { return armazenamento.getItem(CHAVE); } catch { return null; } };
  const marcar = () => { if (!saiu) try { armazenamento.setItem(CHAVE, agora()); } catch { /* modo privado */ } };
  const verificar = () => {
    if (saiu) return true;
    const ultima = ler();
    if (ultima == null) { marcar(); return false; }
    if (!sessaoExpirou(ultima, agora(), limite)) return false;
    saiu = true;
    try { armazenamento.removeItem(CHAVE); } catch { /* ignora */ }
    aoExpirar?.();
    return true;
  };
  return { marcar, verificar };
}
