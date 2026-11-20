// Regras de graduação da vitrine (ajustáveis): grau por aulas + tempo; faixa com 4 graus + tempo mínimo na faixa.
import { diasEntre } from "./datas.js";
import { FAIXAS } from "../ui/faixa.js";

export const REGRAS = { aulasPorGrau: 30, mesesPorGrau: 3, mesesMinFaixa: { branca: 12, azul: 24, roxa: 18, marrom: 12 } };

export const mesesEntre = (a, b) => Math.floor(diasEntre(a, b) / 30.44);

export function aulasDesde(alunoId, iso, checkins) {
  let n = 0;
  for (const c of checkins) if (c.alunoId === alunoId && c.data > iso) n++;
  return n;
}

export function aptidao(aluno, checkins, hojeISO) {
  const aulas = aulasDesde(aluno.id, aluno.ultimaGraduacao, checkins);
  const faltamAulas = Math.max(0, REGRAS.aulasPorGrau - aulas);
  const nada = { tipo: null, aulas, faltamAulas, proximaFaixa: null };
  if (aluno.status !== "ativo" || aluno.faixa === "preta" || faltamAulas > 0) return nada;
  if (aluno.graus < 4) {
    return mesesEntre(aluno.ultimaGraduacao, hojeISO) >= REGRAS.mesesPorGrau ? { ...nada, tipo: "grau" } : nada;
  }
  const minimo = REGRAS.mesesMinFaixa[aluno.faixa] ?? Infinity;
  if (mesesEntre(aluno.desdeFaixa, hojeISO) < minimo) return nada;
  return { ...nada, tipo: "faixa", proximaFaixa: FAIXAS[FAIXAS.indexOf(aluno.faixa) + 1] };
}
