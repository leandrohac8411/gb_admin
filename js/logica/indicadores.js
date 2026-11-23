// Números do Dashboard.
import { segundaDaSemana, somarDias, diaSemana } from "./datas.js";
import { aptidao, passaParaAdulto } from "./graduacao.js";
import { inadimplentes } from "./financeiro.js";

const mesAnterior = comp => { let [a, m] = comp.split("-").map(Number); m--; if (m < 1) { m = 12; a--; } return `${a}-${String(m).padStart(2, "0")}`; };

export function resumoDashboard(dados, hojeISO) {
  const { alunos, checkins, mensalidades, turmas } = dados;
  const comp = hojeISO.slice(0, 7), compAnt = mesAnterior(comp), dia = hojeISO.slice(8);
  const ativos = alunos.filter(a => a.status === "ativo");

  const segunda = segundaDaSemana(hojeISO);
  const semanas = Array.from({ length: 8 }, (_, i) => somarDias(segunda, -7 * (7 - i)));
  const presencaSemanas = semanas.map(() => 0);
  let checkinsMes = 0, checkinsMesAnterior = 0;
  for (const c of checkins) {
    if (c.data > hojeISO) continue;
    if (c.data.startsWith(comp)) checkinsMes++;
    else if (c.data.startsWith(compAnt) && c.data.slice(8) <= dia) checkinsMesAnterior++;
    const i = Math.floor((Date.parse(c.data) - Date.parse(semanas[0])) / (7 * 864e5));
    if (i >= 0 && i < 8) presencaSemanas[i]++;
  }

  return {
    ativos: ativos.length,
    checkinsMes, checkinsMesAnterior,
    recebidoMes: mensalidades.filter(m => m.pagoEm && m.pagoEm.startsWith(comp)).reduce((s, m) => s + (Number(m.valor) || 0), 0),
    inadimplentes: inadimplentes(mensalidades, alunos, hojeISO).length,
    inadimplentesKids: inadimplentes(mensalidades, alunos.filter(a => a.categoria === "kids"), hojeISO).length,
    presencaSemanas, semanas,
    aulasHoje: turmas.filter(t => t.diaSemana === diaSemana(hojeISO)).sort((a, b) => a.horario.localeCompare(b.horario)),
    aptos: ativos.filter(a => aptidao(a, checkins, hojeISO).tipo).length,
    kids: ativos.filter(a => a.categoria === "kids").length,
    aptosKids: ativos.filter(a => a.categoria === "kids" && aptidao(a, checkins, hojeISO).tipo).length,
    viramAdultos: ativos.filter(a => passaParaAdulto(a, hojeISO)).length,
    aniversariantes: ativos.filter(a => a.nascimento && a.nascimento.slice(5, 7) === comp.slice(5)).sort((a, b) => a.nascimento.slice(8).localeCompare(b.nascimento.slice(8)))
  };
}
