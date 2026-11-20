// Contas dos Relatórios.
import { somarDias, diaSemana } from "./datas.js";

export function aulasNosUltimos(alunoId, checkins, hojeISO, dias = 30) {
  const desde = somarDias(hojeISO, -dias);
  let n = 0;
  for (const c of checkins) if (c.alunoId === alunoId && c.data > desde && c.data <= hojeISO) n++;
  return n;
}

const janela = (checkins, hojeISO, dias) => { const desde = somarDias(hojeISO, -dias); return checkins.filter(c => c.data > desde && c.data <= hojeISO); };

// Presenças por dia da semana (0 = domingo … 6 = sábado).
export function presencaPorDia(checkins, hojeISO, dias = 30) {
  const r = [0, 0, 0, 0, 0, 0, 0];
  for (const c of janela(checkins, hojeISO, dias)) r[diaSemana(c.data)]++;
  return r;
}

// Presenças por horário de turma, em ordem de horário.
export function presencaPorHorario(checkins, turmas, hojeISO, dias = 30) {
  const hora = Object.fromEntries(turmas.map(t => [t.id, t.horario]));
  const m = new Map();
  for (const t of turmas) m.set(t.horario, 0);
  for (const c of janela(checkins, hojeISO, dias)) { const h = hora[c.turmaId] || c.hora; m.set(h, (m.get(h) || 0) + 1); }
  return [...m].map(([horario, n]) => ({ horario, n })).sort((a, b) => a.horario.localeCompare(b.horario));
}

// Quem mais treinou nos últimos 30 dias.
export function ranking(checkins, alunos, hojeISO, n = 10) {
  const cont = new Map();
  for (const c of janela(checkins, hojeISO, 30)) cont.set(c.alunoId, (cont.get(c.alunoId) || 0) + 1);
  return alunos.filter(a => cont.has(a.id)).map(a => ({ aluno: a, n: cont.get(a.id) })).sort((x, y) => y.n - x.n || x.aluno.nome.localeCompare(y.aluno.nome)).slice(0, n);
}

// Alunos ativos e receita mensal equivalente de cada plano.
export function receitaPorPlano(alunos, planos) {
  return planos.map(p => {
    const qtd = alunos.filter(a => a.status === "ativo" && a.plano === p.id).length;
    return { id: p.id, nome: p.nome, alunos: qtd, mensal: Math.round(qtd * p.valor / (p.meses || 1)) };
  });
}
