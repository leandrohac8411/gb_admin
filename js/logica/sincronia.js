// Aplica os avisos da nuvem no store sem atrapalhar quem está editando.
// Com uma janela (folha) aberta, o objeto store.dados NÃO é trocado: a janela segue gravando
// no mesmo objeto e, quando fecha, os dados da nuvem são mesclados por cima (nada se perde).
import { mesclar, paraLocal } from "./mesclar.js";

export function criarSincronia(store, { haFolhaAberta, desenhar, agendar = fn => setTimeout(fn, 500) }) {
  let ultimo = null, pendente = false, esperando = false;
  const aplicar = () => { store.dados = mesclar(paraLocal(store.dados), ultimo); };
  const s = {
    receber(reais) { ultimo = reais; pendente = true; s.tentar(); },
    tentar() {
      if (!pendente || !ultimo) return;
      if (haFolhaAberta()) {
        if (!esperando) { esperando = true; agendar(() => { esperando = false; s.tentar(); }); }
        return;
      }
      pendente = false; aplicar(); desenhar();
    },
    // Depois de "Restaurar dados de exemplo" ou "Importar backup": os reais voltam na hora.
    reaplicar() { if (ultimo) aplicar(); }
  };
  return s;
}
