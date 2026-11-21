// Presença pela foto (vitrine): a foto diz QUANTAS pessoas havia; a lista sugere QUEM,
// pelos alunos que mais treinam naquela turma (e no mesmo dia da semana). O professor confirma.
import { somarDias } from "./datas.js";

const JANELA_DIAS = 90;

// pessoas = número de alunos na foto (sem contar o professor).
// Retorna [{ aluno, vezes, mesmoDia, presente, marcado }] na ordem de sugestão.
export function sugerirPresenca({ alunos, checkins, turmas }, turma, data, pessoas) {
  const desde = somarDias(data, -JANELA_DIAS), categoria = turma.categoria || "adulto";
  const mesmoDia = new Set(turmas.filter(t => t.diaSemana === turma.diaSemana && t.id !== turma.id).map(t => t.id));
  const lista = alunos.filter(a => a.status === "ativo" && (a.categoria || "adulto") === categoria).map(aluno => {
    let vezes = 0, outros = 0, presente = false;
    for (const c of checkins) {
      if (c.alunoId !== aluno.id) continue;
      if (c.turmaId === turma.id && c.data === data) presente = true;
      else if (c.data > desde && c.data < data) {
        if (c.turmaId === turma.id) vezes++;
        else if (mesmoDia.has(c.turmaId)) outros++;
      }
    }
    return { aluno, vezes, mesmoDia: outros, presente, pontos: vezes * 2 + outros };
  });
  lista.sort((x, y) => (y.presente - x.presente) || (y.pontos - x.pontos) || x.aluno.nome.localeCompare(y.aluno.nome, "pt-BR"));
  let vagas = Math.max(0, Math.floor(Number(pessoas) || 0) - lista.filter(x => x.presente).length);
  return lista.map(({ pontos, ...x }) => {
    const marcado = x.presente || (pontos > 0 && vagas > 0 && (vagas--, true));
    return { ...x, marcado };
  });
}
