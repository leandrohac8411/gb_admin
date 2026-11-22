// Regras de graduação da vitrine (ajustáveis em Configurações).
// Adulto: grau por aulas + tempo; faixa com 4 graus + tempo mínimo na faixa.
// Kids: igual, com tabela própria + idade mínima da próxima cor; aos 16 anos passa para Adultos.
import { deISO } from "./datas.js";
import { FAIXAS, FAIXAS_KIDS, corBase } from "../ui/faixa.js";

export const REGRAS = { aulasPorGrau: 30, mesesPorGrau: 3, mesesMinFaixa: { branca: 12, azul: 24, roxa: 18, marrom: 12 } };
// Kids: grau MENSAL (1 mês desde a última graduação + mínimo de aulas no período).
export const REGRAS_KIDS = { aulasPorGrau: 4, mesesPorGrau: 1, mesesMinFaixa: 6, idadeMin: { cinza: 4, amarela: 7, laranja: 10, verde: 13 }, idadeAdulto: 16 };

// Meses de calendário completos entre duas datas (20/11/2025 → 20/11/2026 = 12).
export function mesesEntre(a, b) {
  const x = deISO(a), y = deISO(b);
  return (y.ano - x.ano) * 12 + (y.mes - x.mes) - (y.dia < x.dia ? 1 : 0);
}

export function idadeEm(nascimento, hojeISO) {
  if (!nascimento) return null;
  return Math.floor(mesesEntre(nascimento, hojeISO) / 12);
}

export function aulasDesde(alunoId, iso, checkins) {
  let n = 0;
  for (const c of checkins) if (c.alunoId === alunoId && c.data > iso) n++;
  return n;
}

export const ehKids = a => a?.categoria === "kids";
export const regrasDe = a => (ehKids(a) ? REGRAS_KIDS : REGRAS);

export function passaParaAdulto(aluno, hojeISO) {
  return ehKids(aluno) && (idadeEm(aluno.nascimento, hojeISO) ?? 0) >= REGRAS_KIDS.idadeAdulto;
}

export function aptidao(aluno, checkins, hojeISO) {
  const r = regrasDe(aluno), kids = ehKids(aluno);
  const aulas = aulasDesde(aluno.id, aluno.ultimaGraduacao, checkins);
  const faltamAulas = Math.max(0, r.aulasPorGrau - aulas);
  const nada = { tipo: null, aulas, faltamAulas, proximaFaixa: null };
  if (aluno.status !== "ativo" || aluno.faixa === "preta" || faltamAulas > 0) return nada;
  if (aluno.graus < 4) {
    return mesesEntre(aluno.ultimaGraduacao, hojeISO) >= r.mesesPorGrau ? { ...nada, tipo: "grau" } : nada;
  }
  const lista = kids ? FAIXAS_KIDS : FAIXAS;
  const proxima = lista[lista.indexOf(aluno.faixa) + 1];
  if (!proxima) return nada;
  const minimo = kids ? r.mesesMinFaixa : (r.mesesMinFaixa[aluno.faixa] ?? Infinity);
  if (mesesEntre(aluno.desdeFaixa, hojeISO) < minimo) return nada;
  if (kids && (idadeEm(aluno.nascimento, hojeISO) ?? 0) < (r.idadeMin[corBase(proxima)] ?? 0)) return nada;
  return { ...nada, tipo: "faixa", proximaFaixa: proxima };
}

// Configurações → regras (os objetos REGRAS e REGRAS_KIDS são os mesmos usados por todas as telas).
const numero = (v, padrao) => (v === "" || v == null || !Number.isFinite(Number(v)) ? padrao : Number(v));
export function aplicarRegras(r, rKids) {
  if (r) {
    REGRAS.aulasPorGrau = numero(r.aulasPorGrau, REGRAS.aulasPorGrau);
    REGRAS.mesesPorGrau = numero(r.mesesPorGrau, REGRAS.mesesPorGrau);
    REGRAS.mesesMinFaixa = { ...REGRAS.mesesMinFaixa, ...(r.mesesMinFaixa || {}) };
  }
  if (rKids) {
    REGRAS_KIDS.aulasPorGrau = numero(rKids.aulasPorGrau, REGRAS_KIDS.aulasPorGrau);
    REGRAS_KIDS.mesesPorGrau = numero(rKids.mesesPorGrau, REGRAS_KIDS.mesesPorGrau);
    REGRAS_KIDS.mesesMinFaixa = numero(rKids.mesesMinFaixa, REGRAS_KIDS.mesesMinFaixa);
    REGRAS_KIDS.idadeMin = { ...REGRAS_KIDS.idadeMin, ...(rKids.idadeMin || {}) };
  }
}
