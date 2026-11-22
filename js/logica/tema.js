// Tema da aula: semana do ciclo de cada currículo da turma → tema no Cronograma.
import { semanaDoCiclo } from "./ciclo.js";

export function temaDaAula(d, turma, dataISO) {
  const programas = turma?.programa === "GB1+GB2" ? ["GB1", "GB2"] : ["GB1", "GB2"].includes(turma?.programa) ? [turma.programa] : [];
  return programas.map(programa => {
    const semana = semanaDoCiclo(dataISO, d.config?.ancoras || [], programa);
    const s = (d.cronograma || []).find(x => x.programa === programa && x.semana === semana);
    return s ? { programa, semana, categoria: s.categoria, tema: s.tema } : null;
  }).filter(Boolean);
}
