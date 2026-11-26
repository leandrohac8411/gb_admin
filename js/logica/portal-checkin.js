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

// Hora local de Brasília (UTC-3, sem horário de verão) de um instante em ms: { data: "AAAA-MM-DD", min }.
function brasilia(msUTC) {
  const d = new Date(msUTC - 3 * 3600_000);
  return { data: d.toISOString().slice(0, 10), min: d.getUTCHours() * 60 + d.getUTCMinutes() };
}

// O check-in vale se a turma adulta existe, é daquele dia da semana, não é futuro e foi criado
// (hora do servidor, criadoEm) no próprio dia, de 30 min antes do início até 1 hora depois do fim da aula.
function checkinValido(p, turmas, hoje) {
  const t = turmas.find(x => x.id === p.turmaId && (x.categoria || "adulto") === "adulto");
  if (!t || typeof p.data !== "string" || p.data > hoje || !Number.isFinite(p.criadoEm)) return false;
  const [a, m, d] = p.data.split("-").map(Number);
  if (new Date(Date.UTC(a, m - 1, d)).getUTCDay() !== t.diaSemana) return false;
  const quando = brasilia(p.criadoEm), ini = minutos(t.horario);
  return quando.data === p.data && quando.min >= ini - 30 && quando.min <= ini + (Number(t.duracaoMin) || 60) + 60;
}

// Check-ins feitos pelo aluno viram presença no painel, sem duplicar, com id fixo (ca_<id do pendente>):
// dois painéis abertos ao mesmo tempo gravam a mesma presença. Todo pendente é apagado (os inválidos também).
export function juntarCheckinsAluno(checkins, pendentes, { turmas, hoje }) {
  const chave = c => `${c.alunoId}|${c.turmaId}|${c.data}`;
  const ja = new Set(checkins.map(chave)), novos = [], apagar = [];
  for (const p of pendentes) {
    apagar.push(p.id);
    if (!checkinValido(p, turmas, hoje) || ja.has(chave(p))) continue;
    ja.add(chave(p));
    novos.push({ id: `ca_${p.id}`, alunoId: p.alunoId, turmaId: p.turmaId, data: p.data, hora: p.hora, origem: "aluno" });
  }
  return { novos, apagar };
}
