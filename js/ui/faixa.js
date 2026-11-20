// Faixa desenhada (mesmo desenho do Diário de Tatame), agora em todas as cores de adulto.
// Ponta preta com uma fita branca por grau; a faixa preta tem a ponta vermelha.
export const FAIXAS = ["branca", "azul", "roxa", "marrom", "preta"];
export const CORES_FAIXA = { branca: "#f4f2ee", azul: "#2449c9", roxa: "#6b2fa8", marrom: "#6e4325", preta: "#151517" };

export const nomeFaixa = f => (f ? f[0].toUpperCase() + f.slice(1) : "");

export function faixaSVG(faixa, graus = 0, { mini = false } = {}) {
  const cor = CORES_FAIXA[faixa] || CORES_FAIXA.branca;
  const g = Math.max(0, Math.min(4, Math.floor(Number(graus) || 0)));
  const ponta = faixa === "preta" ? "#c8201b" : "#111111";
  const linha = faixa === "branca" ? "#8a8580" : "#ffffff";
  let fitas = "";
  for (let i = 0; i < g; i++) fitas += `<rect x="${214 + i * 13}" y="4" width="7" height="36" fill="#ffffff"/>`;
  return `<svg class="belt${mini ? " mini" : ""}" viewBox="0 0 300 44" role="img" aria-label="Faixa ${faixa}, ${g} graus">` +
    `<rect x="0" y="4" width="300" height="36" rx="4" fill="${cor}"${faixa === "branca" ? ' stroke="#d9d4cf" stroke-width="1.5"' : ""}/>` +
    `<rect x="0" y="9" width="300" height="1.2" fill="${linha}" opacity=".22"/>` +
    `<rect x="0" y="16" width="300" height="1.2" fill="${linha}" opacity=".14"/>` +
    `<rect x="0" y="28" width="300" height="1.2" fill="${linha}" opacity=".14"/>` +
    `<rect x="0" y="34.5" width="300" height="1.2" fill="${linha}" opacity=".22"/>` +
    `<rect x="206" y="4" width="64" height="36" fill="${ponta}"/>` + fitas + "</svg>";
}
