// Portal do aluno com as telas do Diário de Tatame: monta, a partir do que vem do GB Admin (espelho,
// grade, check-ins) e do que o aluno escreveu (diário, metas), os dados no formato que o Diário usa.
import { aulaPrevista } from "./ciclo.js";

export const LIMITE_AULA = 20000; // caracteres do texto de cada aula no banco (a regra confere)
const CAMPOS_FIXOS = ["id", "turmaId", "data", "fotoId", "fotoMini", "criadoEm"];

export function montarEstadoDiario({ portal, grade: g, diario, pendentes, prefs }) {
  const turmas = g?.turmas || {}, ancoras = g?.ancoras || [];
  const grade = Object.entries(turmas).map(([id, t]) => ({ id, diaSemana: t.diaSemana, horario: t.horario, programa: t.programa, professor: t.professor || "", aula: t.aula || null, duracaoMin: Number(t.duracaoMin) || 60 }))
    .sort((a, b) => a.diaSemana - b.diaSemana || a.horario.localeCompare(b.horario));
  const curriculo = Object.fromEntries((g?.cronograma || []).map(s => [`${s.programa}-${s.semana}`, s]));

  const p = portal || {}, nGraus = Math.max(0, Math.min(4, Number(p.graus) || 0));
  const perfil = {
    nome: p.nome || "", faixa: { cor: p.faixa || "branca", desde: (p.desdeFaixa || "").slice(0, 7) },
    // Só o último grau tem data conhecida (a da última graduação no GB Admin).
    graus: Array.from({ length: nGraus }, (_, i) => (i === nGraus - 1 && p.ultimaGraduacao ? { numero: i + 1, data: p.ultimaGraduacao } : { numero: i + 1 })),
    metaSemanal: prefs?.metaSemanal || 2, metaAulasRoxa: prefs?.metaAulasRoxa || 175,
    proximoPasso: p.proximoPasso || null, nascimento: p.nascimento || null, sexo: p.sexo || null,
    peso: p.peso ?? null, telefone: p.telefone || "", plano: p.plano || "", foto: p.foto || null, fotoPerfilId: null
  };

  // Uma aula por presença (do painel) ou check-in ainda pendente; o diário do aluno entra por cima.
  const escrito = Object.fromEntries((diario || []).map(x => [x.id, x]));
  const presencas = new Map();
  for (const x of [...(p.presencas || []), ...(pendentes || [])]) {
    const id = `${x.turmaId}_${x.data}`;
    if (!presencas.has(id)) presencas.set(id, x);
  }
  const aulas = [...presencas].map(([id, x]) => {
    const t = turmas[x.turmaId];
    const programa = t?.programa || x.programa || "a definir";
    const prevista = aulaPrevista(x.data, { programa, aula: t?.aula || null }, ancoras);
    const base = {
      id, turmaId: x.turmaId, data: x.data, horario: t?.horario || x.horario || x.hora || "",
      professor: t?.professor || "", duracaoMin: Number(t?.duracaoMin) || 60,
      prevista, realizada: { ...prevista }, foiPrevista: true,
      tecnicas: [], rolaSofri: [], dificuldade: null, aprendi: "", revisar: "",
      local: { verificado: true }
    };
    return { ...base, ...(escrito[id] || {}), id, turmaId: x.turmaId, data: x.data, fotoId: `aula:${id}` };
  });
  return { perfil, aulas, grade, curriculo, ancoras };
}

// O que vai para o banco: só as anotações da aula (sem id, turma, data e foto), em texto JSON.
export function aulaParaGravar(aula) {
  const limpa = Object.fromEntries(Object.entries(aula || {}).filter(([k]) => !CAMPOS_FIXOS.includes(k)));
  const txt = JSON.stringify(limpa);
  return txt.length <= LIMITE_AULA ? txt : null;
}
