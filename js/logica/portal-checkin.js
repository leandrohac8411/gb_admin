// Portal do aluno: check-in pelo celular (só no dia, na academia e na aula que está acontecendo).
const minutos = h => { const [a, b] = String(h || "0:0").split(":").map(Number); return a * 60 + b; };

// Aula acontecendo = de 30 minutos antes do início até o fim (início + duração, 60 se não tiver).
export function turmaDoCheckin(turmas, diaSemana, minutosAgora) {
  const agora = turmas.filter(t => t.diaSemana === diaSemana).filter(t => {
    const ini = minutos(t.horario);
    return minutosAgora >= ini - 30 && minutosAgora <= ini + (Number(t.duracaoMin) || 60);
  });
  if (!agora.length) return { nenhuma: true };
  return agora.length === 1 ? { turma: agora[0] } : { escolher: agora };
}

export const idCheckinAluno = (alunoId, turmaId, data) => `${alunoId}_${turmaId}_${data}`;

// Check-ins feitos pelo aluno viram presença no painel, sem duplicar; todos os pendentes são apagados.
export function juntarCheckinsAluno(checkins, pendentes, novoId) {
  const chave = c => `${c.alunoId}|${c.turmaId}|${c.data}`;
  const ja = new Set(checkins.map(chave)), novos = [], apagar = [];
  for (const p of pendentes) {
    apagar.push(p.id);
    if (ja.has(chave(p))) continue;
    ja.add(chave(p));
    novos.push({ id: novoId("c"), alunoId: p.alunoId, turmaId: p.turmaId, data: p.data, hora: p.hora, origem: "aluno" });
  }
  return { novos, apagar };
}
