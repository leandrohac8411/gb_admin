// Portal do aluno (/aluno): regras das telas, sem Firebase (testáveis).
import { temaDaAula } from "./tema.js";
import { diaSemana } from "./datas.js";

const RESULTADOS = ["nao", "asvezes", "bem"];

// Diário da aula: mesmos limites da regra diarioOk do banco. null = inválido.
export function diarioValido(x) {
  const txt = v => String(v ?? "").trim();
  const aprendi = txt(x?.aprendi), revisar = txt(x?.revisar);
  if (aprendi.length > 4000 || revisar.length > 4000) return null;
  const tecnicas = Array.isArray(x?.tecnicas) ? x.tecnicas : [];
  if (tecnicas.length > 50 || tecnicas.some(t => !t || !txt(t.nome) || txt(t.nome).length > 200 || !RESULTADOS.includes(t.resultado))) return null;
  const r = { aprendi, revisar, tecnicas: tecnicas.map(t => ({ nome: txt(t.nome), resultado: t.resultado })) };
  if (x?.dificuldade != null) {
    const n = Number(x.dificuldade);
    if (!Number.isInteger(n) || n < 1 || n > 5) return null;
    r.dificuldade = n;
  }
  return r;
}

export function esteveNaAula(portal, pendentes, turmaId, data) {
  const igual = p => p.turmaId === turmaId && p.data === data;
  return (portal?.presencas || []).some(igual) || (pendentes || []).some(igual);
}

// Aulas adultas do dia: horário, programa, professor, tema do ciclo e roteiro.
export function aulasDoDia(grade, dataISO) {
  const dia = diaSemana(dataISO), base = { config: { ancoras: grade?.ancoras || [] }, cronograma: grade?.cronograma || [] };
  return Object.entries(grade?.turmas || {}).filter(([, t]) => t.diaSemana === dia)
    .sort(([, a], [, b]) => a.horario.localeCompare(b.horario))
    .map(([id, t]) => ({
      turmaId: id, horario: t.horario, programa: t.programa, professor: t.professor, duracaoMin: t.duracaoMin,
      temas: temaDaAula(base, { ...t, id }, dataISO),
      roteiro: (grade.modelosAula || []).find(m => m.id === t.modeloAulaId)?.blocos || []
    }));
}

export function frequenciaDoMes(presencas, mesISO) {
  return new Set((presencas || []).filter(p => p.data.startsWith(mesISO)).map(p => `${p.data}|${p.turmaId}`)).size;
}

const ERROS = {
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/wrong-password": "E-mail ou senha incorretos.",
  "auth/user-not-found": "E-mail ou senha incorretos.",
  "auth/invalid-email": "Confira o e-mail.",
  "auth/email-already-in-use": "Esse e-mail já tem conta. Toque em Entrar ou em Esqueci a senha.",
  "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
  "auth/too-many-requests": "Muitas tentativas. Espere um pouco e tente de novo.",
  "auth/network-request-failed": "Sem internet. Confira a conexão e tente de novo."
};
export const mensagemDeErroLogin = code => ERROS[code] || "Não deu para entrar. Tente de novo.";
