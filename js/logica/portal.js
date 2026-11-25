// Portal do aluno: o que o painel copia para as coleções do portal (caminho A do desenho
// docs/superpowers/specs/2026-11-25-portal-aluno-design.md). Só o que cada aluno pode ver.
import { aptidao } from "./graduacao.js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Kids fica para depois: só adulto pode ter acesso ao portal.
export const podeTerAcesso = aluno => (aluno?.categoria || "adulto") === "adulto";

export function emailValido(texto) {
  const e = String(texto ?? "").trim().toLowerCase();
  return e.length <= 254 && EMAIL.test(e) ? e : null;
}

// Cópia do aluno: faixa, presenças (com horário e programa, para a aula continuar legível se a
// turma mudar) e o próximo passo da graduação. Nada de telefone, mensalidade ou dado de outros.
export function espelhoAluno(d, aluno, hojeISO) {
  const turmas = Object.fromEntries((d.turmas || []).map(t => [t.id, t]));
  const presencas = (d.checkins || []).filter(c => c.alunoId === aluno.id)
    .map(c => ({ data: c.data, turmaId: c.turmaId, hora: c.hora || "", horario: turmas[c.turmaId]?.horario || "", programa: turmas[c.turmaId]?.programa || "" }))
    .sort((x, y) => y.data.localeCompare(x.data) || y.hora.localeCompare(x.hora));
  return {
    nome: aluno.nome, faixa: aluno.faixa, graus: Number(aluno.graus) || 0,
    desdeFaixa: aluno.desdeFaixa || "", ultimaGraduacao: aluno.ultimaGraduacao || "",
    presencas, proximoPasso: aptidao(aluno, d.checkins || [], hojeISO)
  };
}

export const espelhoAcesso = (aluno, email) => ({ alunoId: aluno.id, nome: aluno.nome, ativo: aluno.status === "ativo" });

// Grade do portal: só turmas adultas e só o que a tela do aluno usa (sem dado pessoal).
export function espelhoGrade(d) {
  const profs = Object.fromEntries((d.professores || []).map(p => [p.id, p.nome]));
  const turmas = {};
  for (const t of d.turmas || []) {
    if ((t.categoria || "adulto") !== "adulto") continue;
    turmas[t.id] = { diaSemana: t.diaSemana, horario: t.horario, programa: t.programa, professor: profs[t.professorId] || "", modeloAulaId: t.modeloAulaId || "", aula: t.aula || "", duracaoMin: Number(t.duracaoMin) || 60 };
  }
  return { turmas, cronograma: d.cronograma || [], ancoras: d.config?.ancoras || [], modelosAula: d.modelosAula || [] };
}

// anterior: id -> JSON já gravado; novos: id -> objeto. Grava o que mudou e apaga o que sumiu.
export function mudancasEspelho(anterior, novos) {
  const gravar = [], apagar = [];
  for (const [id, obj] of novos) if (anterior.get(id) !== JSON.stringify(obj)) gravar.push([id, obj]);
  for (const id of anterior.keys()) if (!novos.has(id)) apagar.push(id);
  return { gravar, apagar };
}
