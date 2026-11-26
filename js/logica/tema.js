// Aula do dia: semana do ciclo de cada currículo da turma → Aula A (seg/ter) ou B (qua/qui) no Cronograma.
// Sexta e sábado (sem aula padrão) mostram A e B, como revisão. Turma com "aula" fixa usa a dela.
import { semanaDoCiclo, aulaPadrao, CICLO_SEMANAS } from "./ciclo.js";
import { cronogramaExemplo } from "../dados-extras.js";

export function temaDaAula(d, turma, dataISO) {
  const programas = turma?.programa === "GB1+GB2" ? ["GB1", "GB2"] : ["GB1", "GB2"].includes(turma?.programa) ? [turma.programa] : [];
  const aulas = turma?.aula === "A" || turma?.aula === "B" ? [turma.aula] : aulaPadrao(dataISO) ? [aulaPadrao(dataISO)] : ["A", "B"];
  const r = [];
  for (const programa of programas) {
    const semana = semanaDoCiclo(dataISO, d.config?.ancoras || [], programa);
    const s = (d.cronograma || []).find(x => x.programa === programa && x.semana === semana);
    if (!s) continue;
    for (const aula of aulas) {
      const a = s[`aula${aula}`];
      if (a?.tema) r.push({ programa, semana, aula, tema: a.tema, tecnicas: a.tecnicas || [] });
    }
  }
  return r;
}

// Lê o currículo no formato do Diário de Tatame: [{ programa, semana, aulaA: { tema, tecnicas: [{ nome, categoria }] }, aulaB }].
export function lerCurriculo(texto) {
  let lista;
  try { lista = JSON.parse(texto); } catch { throw new Error("O arquivo não é um JSON válido."); }
  if (!Array.isArray(lista)) throw new Error("O arquivo precisa ser uma lista de semanas.");
  const limpaAula = a => a && typeof a === "object" ? {
    tema: String(a.tema || "").trim().slice(0, 200),
    tecnicas: (Array.isArray(a.tecnicas) ? a.tecnicas : []).filter(t => t && t.nome).map(t => ({ nome: String(t.nome).trim().slice(0, 200), categoria: String(t.categoria || "").trim().slice(0, 40) }))
  } : { tema: "", tecnicas: [] };
  return lista.map((s, i) => {
    if (!["GB1", "GB2"].includes(s?.programa)) throw new Error(`Semana ${i + 1}: o programa precisa ser GB1 ou GB2.`);
    const semana = Number(s.semana);
    if (!Number.isInteger(semana) || semana < 1 || semana > CICLO_SEMANAS) throw new Error(`Semana ${i + 1}: o número da semana vai de 1 a ${CICLO_SEMANAS}.`);
    return { programa: s.programa, semana, aulaA: limpaAula(s.aulaA), aulaB: limpaAula(s.aulaB) };
  });
}

// Para planejar, o domingo já pertence à semana que começa na segunda seguinte.
export function diaDeReferencia(hojeISO) {
  const [a, m, d] = hojeISO.split("-").map(Number);
  const data = new Date(Date.UTC(a, m - 1, d));
  if (data.getUTCDay() !== 0) return hojeISO;
  data.setUTCDate(data.getUTCDate() + 1);
  return data.toISOString().slice(0, 10);
}

// Importar o currículo real: as semanas do arquivo entram (ou atualizam), e as semanas que ainda são
// iguaizinhas ao cronograma de exemplo saem (o exemplo do GB2 sumiria só importando o GB1). Semana
// editada à mão fica. "exemplo" vem de cronogramaExemplo() (dados-extras.js).
export function aplicarCurriculo(cronograma, semanasNovas, exemplo = cronogramaExemplo()) {
  const ehExemplo = s => exemplo.some(x => x.programa === s.programa && x.semana === s.semana
    && JSON.stringify(x.aulaA) === JSON.stringify(s.aulaA) && JSON.stringify(x.aulaB) === JSON.stringify(s.aulaB));
  const r = (cronograma || []).filter(s => !ehExemplo(s)).map(s => ({ ...s }));
  for (const s of semanasNovas) {
    const atual = r.find(x => x.programa === s.programa && x.semana === s.semana);
    if (atual) Object.assign(atual, { aulaA: s.aulaA, aulaB: s.aulaB });
    else r.push({ id: `${s.programa}-${s.semana}`, ...s });
  }
  return r;
}
