// Regras de graduação (ajustáveis em Configurações).
// Adulto: cada faixa tem um tempo até a próxima (azul 24 meses, roxa 12...). Esse tempo é dividido em 5 partes
// iguais: 4 graus + a troca de faixa (o 4º grau fica uns meses antes da troca, não colado nela). As aulas da
// faixa são estimadas por semanas x treinos por semana x (1 - folga de recesso/feriado); cada passo exige a
// parte proporcional das aulas desde que pegou a faixa E a data prevista. Quem treina mais cumpre as aulas
// antes, mas espera o tempo; quem treina menos atrasa.
// Kids: igual, com tabela própria + idade mínima da próxima cor; aos 16 anos passa para Adultos.
import { deISO, somarDias, diasEntre } from "./datas.js";
import { FAIXAS, FAIXAS_KIDS, corBase } from "../ui/faixa.js";

export const REGRAS = { mesesFaixa: { branca: 12, azul: 24, roxa: 12, marrom: 12 }, treinosPorSemana: 2, folgaPct: 15 };

// Plano de uma faixa adulta: dias até a próxima, aulas estimadas, aulas por grau e o dia (desde a faixa) de cada grau.
export function planoDaFaixa(faixa, r = REGRAS) {
  const meses = r.mesesFaixa?.[faixa];
  if (!meses) return null;
  const diasFaixa = Math.floor(meses * 365.25 / 12);
  const aulasFaixa = Math.round(diasFaixa / 7 * r.treinosPorSemana * (1 - r.folgaPct / 100));
  return { diasFaixa, aulasFaixa, aulasPorGrau: Math.round(aulasFaixa / 5),
    graus: [1, 2, 3, 4].map(n => ({ numero: n, dias: Math.round(n * diasFaixa / 5), aulas: Math.ceil(n * aulasFaixa / 5) })) };
}
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
  if (!ehKids(aluno)) return aptidaoAdulto(aluno, checkins, hojeISO);
  const r = regrasDe(aluno), kids = true;
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
    // Configuração antiga (aulas e meses por grau) não tem mesesFaixa: fica o padrão novo.
    if (r.mesesFaixa) REGRAS.mesesFaixa = { ...REGRAS.mesesFaixa, ...r.mesesFaixa };
    REGRAS.treinosPorSemana = numero(r.treinosPorSemana, REGRAS.treinosPorSemana);
    REGRAS.folgaPct = numero(r.folgaPct, REGRAS.folgaPct);
  }
  if (rKids) {
    REGRAS_KIDS.aulasPorGrau = numero(rKids.aulasPorGrau, REGRAS_KIDS.aulasPorGrau);
    REGRAS_KIDS.mesesPorGrau = numero(rKids.mesesPorGrau, REGRAS_KIDS.mesesPorGrau);
    REGRAS_KIDS.mesesMinFaixa = numero(rKids.mesesMinFaixa, REGRAS_KIDS.mesesMinFaixa);
    REGRAS_KIDS.idadeMin = { ...REGRAS_KIDS.idadeMin, ...(rKids.idadeMin || {}) };
  }
}

// Adulto: proximo passo n (1 a 4 = grau, 5 = faixa) pela data prevista desde a faixa e pelas aulas proporcionais.
function aptidaoAdulto(aluno, checkins, hojeISO) {
  const plano = planoDaFaixa(aluno.faixa);
  const aulas = aulasDesde(aluno.id, aluno.desdeFaixa, checkins);
  const nada = { tipo: null, aulas, faltamAulas: 0, proximaFaixa: null, dataPrevista: null, diasFaltam: null, aulasNecessarias: null, trocaFaixa: null };
  if (!plano) return nada;
  const n = Math.min(4, Number(aluno.graus) || 0) + 1;
  const aulasNecessarias = Math.ceil(n * plano.aulasFaixa / 5);
  const dataPrevista = somarDias(aluno.desdeFaixa, n === 5 ? plano.diasFaixa : plano.graus[n - 1].dias);
  const dataFaixa = somarDias(aluno.desdeFaixa, plano.diasFaixa);
  const r = { ...nada, faltamAulas: Math.max(0, aulasNecessarias - aulas), aulasNecessarias, dataPrevista,
    diasFaltam: Math.max(0, diasEntre(hojeISO, dataPrevista)), trocaFaixa: { data: dataFaixa, dias: Math.max(0, diasEntre(hojeISO, dataFaixa)) } };
  if (aluno.status !== "ativo" || r.faltamAulas > 0 || hojeISO < dataPrevista) return r;
  if (n <= 4) return { ...r, tipo: "grau" };
  const proxima = FAIXAS[FAIXAS.indexOf(aluno.faixa) + 1];
  return proxima ? { ...r, tipo: "faixa", proximaFaixa: proxima } : r;
}

// Barra de progresso do próximo passo: adulto conta as aulas desde a faixa (meta proporcional ao passo);
// kids, as aulas desde a última graduação (mínimo do mês).
export function progressoGraduacao(aluno, apt) {
  if (ehKids(aluno)) return { feitas: apt.aulas, necessarias: REGRAS_KIDS.aulasPorGrau };
  return { feitas: apt.aulas, necessarias: apt.aulasNecessarias || 0 };
}
