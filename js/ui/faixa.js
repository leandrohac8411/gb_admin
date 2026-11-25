// Faixa desenhada (mesmo desenho do Diário de Tatame), em todas as cores de adulto e kids.
// Ponta preta com uma fita branca por grau; a faixa preta tem a ponta vermelha.
// Kids: "cinza-branca" = cinza com listra branca no meio; "cinza-preta" = listra preta.
export const FAIXAS = ["branca", "azul", "roxa", "marrom", "preta"];
export const FAIXAS_KIDS = ["branca",
  "cinza-branca", "cinza", "cinza-preta", "amarela-branca", "amarela", "amarela-preta",
  "laranja-branca", "laranja", "laranja-preta", "verde-branca", "verde", "verde-preta"];
export const CORES_FAIXA = {
  branca: "#f4f2ee", azul: "#2449c9", roxa: "#6b2fa8", marrom: "#6e4325", preta: "#151517",
  cinza: "#8e8e93", amarela: "#efbf1f", laranja: "#ee7d1c", verde: "#2e9a4f"
};
for (const f of FAIXAS_KIDS) if (!CORES_FAIXA[f]) CORES_FAIXA[f] = CORES_FAIXA[f.split("-")[0]];

export const faixasDe = categoria => (categoria === "kids" ? FAIXAS_KIDS : FAIXAS);
export const corBase = f => String(f || "").split("-")[0];

// Só cores que existem: um backup adulterado não consegue pôr texto/HTML no lugar da faixa.
export const faixaValida = f => FAIXAS.includes(f) || FAIXAS_KIDS.includes(f);
export function nomeFaixa(f) {
  if (!f) return "";
  if (!faixaValida(f)) return "Faixa inválida";
  const [cor, listra] = f.split("-");
  const nome = cor[0].toUpperCase() + cor.slice(1);
  return listra ? `${nome} e ${listra}` : nome;
}

export function faixaSVG(faixa, graus = 0, { mini = false } = {}) {
  const base = corBase(faixa), listra = String(faixa || "").split("-")[1];
  const cor = CORES_FAIXA[base] || CORES_FAIXA.branca;
  const g = Math.max(0, Math.min(4, Math.floor(Number(graus) || 0)));
  const ponta = faixa === "preta" ? "#c8201b" : "#111111";
  const linha = base === "branca" || base === "amarela" ? "#8a8580" : "#ffffff";
  let fitas = "";
  for (let i = 0; i < g; i++) fitas += `<rect x="${214 + i * 13}" y="4" width="7" height="36" fill="#ffffff"/>`;
  const rotulo = nomeFaixa(faixa).toLowerCase();
  return `<svg class="belt${mini ? " mini" : ""}" viewBox="0 0 300 44" role="img" aria-label="Faixa ${rotulo}, ${g} graus">` +
    `<rect x="0" y="4" width="300" height="36" rx="4" fill="${cor}"${base === "branca" ? ' stroke="#d9d4cf" stroke-width="1.5"' : ""}/>` +
    (listra ? `<rect x="0" y="17.5" width="300" height="9" fill="${listra === "branca" ? "#ffffff" : "#111111"}"/>` : "") +
    `<rect x="0" y="9" width="300" height="1.2" fill="${linha}" opacity=".22"/>` +
    `<rect x="0" y="34.5" width="300" height="1.2" fill="${linha}" opacity=".22"/>` +
    `<rect x="206" y="4" width="64" height="36" fill="${ponta}"/>` + fitas + "</svg>";
}

// Programa da turma na agenda, desenhado como a ponta preta da faixa (com duas fitas brancas).
const semHTML = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export function pontaPrograma(programa) {
  const texto = programa === "GB1+GB2" ? "GB1 · GB2" : (programa || "—");
  return `<span class="ponta">${semHTML(texto)}<i></i><i></i></span>`;
}
