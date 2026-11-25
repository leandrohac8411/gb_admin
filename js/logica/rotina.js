// Rotina da recepção (tarefas do dia, da semana e do mês com contador "x de y")
// e linha do tempo (o que aconteceu na academia), tudo tirado dos próprios dados.
import { diaSemana, diasEntre, segundaDaSemana, somarDias } from "./datas.js";
import { nomeFaixa } from "../ui/faixa.js";

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const mesTexto = comp => MESES[Number(comp.slice(5, 7)) - 1] || comp;

export function rotina(dados, hojeISO) {
  const ativos = dados.alunos.filter(a => a.status === "ativo");
  const seg = segundaDaSemana(hojeISO), comp = hojeISO.slice(0, 7);
  const comCheckin = new Set(dados.checkins.filter(c => c.data >= seg && c.data <= hojeISO).map(c => `${c.data}|${c.turmaId}`));

  // Hoje: cada aula do dia precisa ter a presença lançada.
  const aulasHoje = dados.turmas.filter(t => t.diaSemana === diaSemana(hojeISO));

  // Semana: aulas que já aconteceram de segunda até ontem (as de hoje ficam na tarefa de cima).
  const aulasSemana = [];
  for (let dia = seg; dia < hojeISO; dia = somarDias(dia, 1))
    for (const t of dados.turmas) if (t.diaSemana === diaSemana(dia)) aulasSemana.push(`${dia}|${t.id}`);

  // Semana: quem está há 14 dias ou mais sem treinar; conta como feito quem ganhou uma anotação nesta semana.
  const ultimo = {};
  for (const c of dados.checkins) if (c.data <= hojeISO && (!ultimo[c.alunoId] || c.data > ultimo[c.alunoId])) ultimo[c.alunoId] = c.data;
  const sumidos = ativos.filter(a => diasEntre(ultimo[a.id] || a.desde, hojeISO) >= 14);
  const contatados = new Set((dados.acompanhamentos || []).filter(x => x.data >= seg && x.data <= hojeISO).map(x => x.alunoId));

  // Mês: comportamento dos kids (respeito, disciplina...) avaliado uma vez por mês.
  const kids = ativos.filter(a => a.categoria === "kids");
  const avaliados = new Set((dados.avaliacoes || []).filter(v => v.mes === comp).map(v => v.alunoId));

  return [
    { id: "presencas", quando: "Hoje", titulo: "Registre as presenças das aulas", rota: "checkins", icone: "checkins",
      feitas: aulasHoje.filter(t => comCheckin.has(`${hojeISO}|${t.id}`)).length, total: aulasHoje.length, semNada: "Sem aulas hoje" },
    { id: "semana", quando: "Esta semana", titulo: "Confira as presenças da semana", rota: "checkins", icone: "agenda",
      feitas: aulasSemana.filter(k => comCheckin.has(k)).length, total: aulasSemana.length, semNada: "A semana começou hoje" },
    { id: "sumidos", quando: "Esta semana", titulo: "Fale com quem sumiu (14+ dias sem treinar)", rota: "acompanhamentos", icone: "alerta",
      feitas: sumidos.filter(a => contatados.has(a.id)).length, total: sumidos.length, semNada: "Ninguém sumido" },
    { id: "avaliacoes", quando: "Este mês", titulo: "Avalie o comportamento dos kids", rota: "alunos", icone: "alunos",
      feitas: kids.filter(a => avaliados.has(a.id)).length, total: kids.length, semNada: "Nenhum kid ativo" }
  ].map(t => ({ ...t, vazio: t.total === 0, ok: t.total > 0 && t.feitas >= t.total }));
}

export const TIPOS_TEMPO = { checkin: "Check-ins", pagamento: "Pagamentos", graduacao: "Graduações", matricula: "Matrículas", outros: "Outros" };

export function linhaDoTempo(dados, hojeISO, { tipo = "", dias = 14 } = {}) {
  const alunos = Object.fromEntries(dados.alunos.map(a => [a.id, a]));
  const turmas = Object.fromEntries(dados.turmas.map(t => [t.id, t]));
  const desde = somarDias(hojeISO, -dias), dentro = d => d && d > desde && d <= hojeISO;
  const nome = id => alunos[id]?.nome || "Aluno removido", itens = [];
  const add = (t, data, hora, titulo, detalhe, rota) => { if ((!tipo || tipo === t) && dentro(data)) itens.push({ tipo: t, data, hora: hora || "", titulo, detalhe, rota }); };

  for (const c of dados.checkins) {
    const t = turmas[c.turmaId];
    add("checkin", c.data, c.hora, `${nome(c.alunoId)} fez check-in`, t ? (t.categoria === "kids" ? "Kids" : t.programa) + ` · ${t.horario.replace(":", "h")}` : "aula removida", `aluno/${c.alunoId}`);
  }
  for (const m of dados.mensalidades) if (m.pagoEm)
    add("pagamento", m.pagoEm, "", `${alunos[m.alunoId]?.nome || m.alunoNome || "Aluno removido"} pagou a mensalidade`, `${mesTexto(m.competencia)} · R$ ${Number(m.valor).toFixed(2).replace(".", ",")}`, "financeiro");
  for (const g of dados.graduacoes)
    add("graduacao", g.data, "", `${nome(g.alunoId)} graduou`, g.graus ? `Faixa ${nomeFaixa(g.faixa).toLowerCase()} · ${g.graus}º grau` : `Nova faixa: ${nomeFaixa(g.faixa).toLowerCase()}`, `aluno/${g.alunoId}`);
  for (const a of dados.alunos)
    add("matricula", a.desde, "", `${a.nome} se matriculou`, a.categoria === "kids" ? "Turma Kids" : "Turma de Adultos", `aluno/${a.id}`);
  for (const x of dados.despesas || [])
    if (x.pago) add("outros", x.data, "", `Despesa paga: ${x.descricao}`, `${x.categoria} · R$ ${Number(x.valor).toFixed(2).replace(".", ",")}`, "financeiro");
  for (const p of dados.prospects || [])
    add("outros", p.criadoEm, "", `Novo interessado: ${p.nome}`, `${p.origem} · ${p.interesse}`, "prospects");
  for (const x of dados.acompanhamentos || [])
    add("outros", x.data, "", `Anotação sobre ${nome(x.alunoId)}`, `${x.tipo} · ${x.texto}`, `aluno/${x.alunoId}`);

  // Mais recente primeiro; no mesmo dia, o que tem horário vem pela hora.
  return itens.sort((a, b) => b.data.localeCompare(a.data) || b.hora.localeCompare(a.hora));
}
