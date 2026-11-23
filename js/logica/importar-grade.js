// Lê o grade-diario.json exportado pelo Perfil do Diário de Tatame.
// Não confia no arquivo: tamanho limitado, chaves perigosas descartadas, cada turma validada.
import { turmaNuvem } from "./validar-nuvem.js";

const MAX_BYTES = 200 * 1024;
const PERIGOSAS = new Set(["__proto__", "constructor", "prototype"]);
const recusar = () => { throw new Error("arquivo não é uma grade do Diário"); };

export function lerGradeDiario(texto) {
  if (typeof texto !== "string" || texto.length > MAX_BYTES) recusar();
  let dados;
  try { dados = JSON.parse(texto, (k, v) => (PERIGOSAS.has(k) ? undefined : v)); } catch { recusar(); }
  if (!dados || dados.origem !== "diario-tatame" || !Array.isArray(dados.turmas)) recusar();
  const turmas = [];
  for (const t of dados.turmas) {
    const programa = !t || /^\s*a definir\s*$/i.test(String(t.programa ?? "")) || !String(t.programa ?? "").trim() ? "GB1+GB2" : t.programa;
    const ok = t && typeof t === "object" ? turmaNuvem({ ...t, programa, categoria: "adulto" }) : null;
    if (ok) turmas.push(ok);
  }
  return { turmas, descartadas: dados.turmas.length - turmas.length };
}
