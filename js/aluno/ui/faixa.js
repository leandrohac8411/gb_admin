// Faixa desenhada (do Diário de Tatame): ponta preta (vermelha na faixa preta) e uma fita branca por grau (0 a 4).
// No portal, a cor vem do GB Admin.
export const CORES = { branca: "#f4f2ee", azul: "#2449c9", roxa: "#6b2fa8", marrom: "#6e4325", preta: "#151517" };
export const NOMES = { branca: "branca", azul: "azul", roxa: "roxa", marrom: "marrom", preta: "preta" };
const ORDEM = ["branca", "azul", "roxa", "marrom", "preta"];
export const corDaFaixa = cor => (CORES[cor] ? cor : "branca");
export const proximaFaixa = cor => ORDEM[ORDEM.indexOf(corDaFaixa(cor)) + 1] || null;

export function faixaSVG(graus = 0, { apagada = false, cor = "azul" } = {}) {
  const c = corDaFaixa(cor), g = Math.max(0, Math.min(4, Math.floor(Number(graus) || 0)));
  let fitas = "";
  for (let i = 0; i < g; i++) fitas += `<rect x="${214 + i * 13}" y="4" width="7" height="36" fill="#ffffff"/>`;
  const linha = c === "branca" ? "#000000" : "#ffffff";
  return `<svg class="belt" viewBox="0 0 300 44" role="img" aria-label="Faixa ${NOMES[c]}, ${g} graus"${apagada ? ' style="opacity:.45"' : ""}>` +
    `<rect x="0" y="4" width="300" height="36" rx="4" fill="${CORES[c]}"${c === "branca" ? ' stroke="#d9d4cc"' : ""}/>` +
    `<rect x="0" y="9" width="300" height="1.2" fill="${linha}" opacity=".12"/>` +
    `<rect x="0" y="16" width="300" height="1.2" fill="${linha}" opacity=".08"/>` +
    `<rect x="0" y="28" width="300" height="1.2" fill="${linha}" opacity=".08"/>` +
    `<rect x="0" y="34.5" width="300" height="1.2" fill="${linha}" opacity=".12"/>` +
    `<rect x="206" y="4" width="64" height="36" fill="${c === "preta" ? "#c8201b" : "#111111"}"/>` + fitas + "</svg>";
}
