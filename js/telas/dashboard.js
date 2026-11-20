// Dashboard: números do mês, presença das últimas 8 semanas, aulas de hoje e alertas.
import { esc, saudacao, dataLonga, horaTexto } from "../ui/util.js";
import { reais } from "../ui/util-admin.js";
import { hojeISO, deISO } from "../logica/datas.js";
import { resumoDashboard } from "../logica/indicadores.js";
import { icone } from "../menu.js";
import { cabecalho, etiquetaPrograma, nomeProfessor, pessoa, DIAS_LONGOS } from "./comum.js";
import { boasVindas } from "./comum.js";

function kpi(rotulo, valor, sub, ic, classe = "") {
  return `<div class="kpi ${classe}"><div class="kpi-top"><span>${rotulo}</span><span class="kpi-ic">${icone(ic)}</span></div><b>${valor}</b><small>${sub}</small></div>`;
}

function variacao(atual, anterior) {
  if (!anterior) return "primeiro mês com dados";
  const p = Math.round((atual - anterior) / anterior * 100);
  return `<span class="var ${p >= 0 ? "sobe" : "desce"}">${p >= 0 ? "▲" : "▼"} ${Math.abs(p)}%</span> vs. mesmo período do mês passado`;
}

export default {
  titulo: "Dashboard",
  montar(el, params, { store }) {
    const hoje = hojeISO(), d = store.dados, r = resumoDashboard(d, hoje);
    const max = Math.max(1, ...r.presencaSemanas);
    const checkinsHoje = t => d.checkins.filter(c => c.turmaId === t.id && c.data === hoje).length;
    const { dia, mes } = deISO(hoje);

    el.innerHTML = cabecalho("Dashboard", `${saudacao().replace(",", "!")} Hoje é ${DIAS_LONGOS[new Date().getDay()].toLowerCase()}, ${dataLonga(hoje)}.`,
      `<a class="btn sec" href="#checkins">${icone("checkins")}Check-ins de hoje</a><a class="btn" href="#alunos/novo">${icone("prospects")}Novo aluno</a>`, boasVindas(d)) +
      `<div class="kpis">
        ${kpi("Alunos ativos", r.ativos, `${r.ativos - r.kids} adultos · ${r.kids} kids`, "alunos", "destaque")}
        ${kpi("Check-ins no mês", r.checkinsMes, variacao(r.checkinsMes, r.checkinsMesAnterior), "checkins")}
        ${kpi("Entrou no caixa", reais(r.recebidoMes), "pagamentos feitos este mês", "financeiro")}
        ${kpi("Inadimplentes", r.inadimplentes, r.inadimplentes ? `${r.inadimplentes - r.inadimplentesKids} adultos · ${r.inadimplentesKids} kids · <a class="link" href="#financeiro">ver</a>` : "tudo em dia", "permissoes", r.inadimplentes ? "ruim" : "")}
      </div>
      <div class="grade-dash">
        <div class="card"><div class="card-cab"><h3>Presença nas últimas 8 semanas</h3><small>check-ins por semana</small></div>
          <div class="barras">${r.presencaSemanas.map((n, i) => `<div class="col"><div class="bar ${i === 7 ? "on" : ""}" style="height:${Math.round(n / max * 100)}%"><i>${n}</i></div>` +
            `<small>${i === 7 ? "Atual" : r.semanas[i].slice(8) + "/" + r.semanas[i].slice(5, 7)}</small></div>`).join("")}</div></div>
        <div class="card"><div class="card-cab"><h3>Aulas de hoje</h3><a class="link" href="#agenda">Agenda</a></div>
          ${r.aulasHoje.length ? `<div class="lista">${r.aulasHoje.map(t => `<a href="#checkins/${t.id}"><span class="hora">${horaTexto(t.horario)}</span>
            <div class="cresce"><b>${etiquetaPrograma(t.programa)}</b><small>Prof. ${esc(nomeProfessor(d, t.professorId))}</small></div>
            <span class="pill info">${checkinsHoje(t)} presente${checkinsHoje(t) === 1 ? "" : "s"}</span></a>`).join("")}</div>` : `<div class="vazio">Sem aulas hoje. Bom descanso!</div>`}
        </div>
        <div class="card"><div class="card-cab"><h3>Atenção</h3></div><div class="lista">
          <a href="#graduacoes"><span class="kpi-ic">${icone("graduacoes")}</span><div class="cresce"><b>${r.aptos} aluno${r.aptos === 1 ? "" : "s"} apto${r.aptos === 1 ? "" : "s"} a graduar</b><small>${r.aptos - r.aptosKids} adultos e ${r.aptosKids} kids, pelas aulas e pelo tempo</small></div><span class="link">Ver</span></a>
          ${r.viramAdultos ? `<a href="#graduacoes"><span class="kpi-ic">${icone("alunos")}</span><div class="cresce"><b>${r.viramAdultos} criança${r.viramAdultos === 1 ? "" : "s"} fez 16 anos</b><small>passa${r.viramAdultos === 1 ? "" : "m"} para a turma de Adultos</small></div><span class="link">Ver</span></a>` : ""}
          <a href="#financeiro"><span class="kpi-ic">${icone("financeiro")}</span><div class="cresce"><b>${r.inadimplentes} com mensalidade atrasada</b><small>cobre pelo WhatsApp ou na recepção</small></div><span class="link">Ver</span></a>
        </div></div>
        <div class="card"><div class="card-cab"><h3>Aniversariantes do mês</h3><small>${r.aniversariantes.length}</small></div>
          ${r.aniversariantes.length ? `<div class="lista">${r.aniversariantes.map(a => `<a href="#aluno/${a.id}">${pessoa(a, `${a.nascimento.slice(8)}/${a.nascimento.slice(5, 7)}${Number(a.nascimento.slice(8)) === dia && Number(a.nascimento.slice(5, 7)) === mes ? " · é hoje! 🎉" : ""}`)}</a>`).join("")}</div>`
            : `<div class="vazio">Ninguém faz aniversário este mês.</div>`}
        </div>
      </div>`;
  }
};
