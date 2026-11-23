// Dashboard (v02): números do mês, presença das últimas semanas, aulas de hoje, pendências,
// mensalidades do mês e aniversariantes — no layout do "Dashboard claro".
import { esc, horaTexto, iniciais, dataCurta } from "../ui/util.js";
import { reais } from "../ui/util-admin.js";
import { hojeISO, deISO, somarDias } from "../logica/datas.js";
import { resumoDashboard } from "../logica/indicadores.js";
import { temaDaAula } from "../logica/tema.js";
import { icone } from "../menu.js";
import { rotina, linhaDoTempo, TIPOS_TEMPO } from "../logica/rotina.js";
import { cabecalho, nomeProfessor } from "./comum.js";

const estado = { semanas: 8, tipo: "", limite: 25 };
const IC_TEMPO = { checkin: "checkins", pagamento: "financeiro", graduacao: "graduacoes", matricula: "alunos", outros: "relogio" };
const diaTexto = (iso, hoje) => iso === hoje ? "Hoje" : iso === somarDias(hoje, -1) ? "Ontem" : dataCurta(iso);

// Linha suave com área esmaecida embaixo (valores → pontos num quadro 90×44).
function spark(valores, cor) {
  const max = Math.max(1, ...valores), min = Math.min(...valores), faixa = Math.max(1, max - min);
  const pts = valores.map((v, i) => `${Math.round(i / Math.max(1, valores.length - 1) * 90)},${Math.round(36 - (v - min) / faixa * 32)}`).join(" ");
  const id = "sp" + cor.slice(1);
  return `<svg class="spark" viewBox="0 0 94 44" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${cor}" stop-opacity=".17"/><stop offset="1" stop-color="${cor}" stop-opacity="0"/></linearGradient></defs>` +
    `<polygon points="0,44 ${pts} 90,44" fill="url(#${id})"/><polyline points="${pts}" stroke="${cor}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;
}

function variacao(atual, anterior) {
  if (!anterior) return "primeiro mês com dados";
  const p = Math.round((atual - anterior) / anterior * 100);
  return `<span class="var ${p >= 0 ? "sobe" : "desce"}">${p >= 0 ? "↑ +" : "↓ "}${p}%</span> vs. mês passado`;
}

const fimDaAula = t => {
  const [h, m] = t.horario.split(":").map(Number), fim = h * 60 + m + (Number(t.duracaoMin) || 60);
  return `${String(Math.floor(fim / 60) % 24).padStart(2, "0")}:${String(fim % 60).padStart(2, "0")}`;
};
const nomeDaTurma = t => t.categoria === "kids" ? `Kids${t.publico ? ` (${t.publico})` : ""}` : `Adulto – ${t.programa}`;

export default {
  titulo: "Dashboard",
  montar(el, params, ctx) {
    const { store } = ctx, hoje = hojeISO(), d = store.dados, r = resumoDashboard(d, hoje);
    const { dia, mes } = deISO(hoje), comp = hoje.slice(0, 7);

    // Entradas no caixa por semana (mesmas 8 semanas do gráfico de presença).
    const caixaSemanas = r.semanas.map(ini => d.mensalidades.filter(m => m.pagoEm && m.pagoEm >= ini && m.pagoEm < somarDias(ini, 7) && m.pagoEm <= hoje)
      .reduce((s, m) => s + (Number(m.valor) || 0), 0));
    const novosMes = d.alunos.filter(a => a.status === "ativo" && (a.desde || "").startsWith(comp)).length;

    // Mensalidades do mês: pagas x em aberto.
    const doMes = d.mensalidades.filter(m => m.competencia === comp);
    const pagas = doMes.filter(m => m.pagoEm).length, pct = doMes.length ? Math.round(pagas / doMes.length * 100) : 0;

    const presentes = t => d.checkins.filter(c => c.turmaId === t.id && c.data === hoje).length;
    // Referência de lotação: o maior número de presentes que a turma já teve.
    const recorde = t => {
      const porDia = {};
      for (const c of d.checkins) if (c.turmaId === t.id) porDia[c.data] = (porDia[c.data] || 0) + 1;
      return Math.max(1, ...Object.values(porDia));
    };

    const rot = rotina(d, hoje), tempo = linhaDoTempo(d, hoje, { tipo: estado.tipo });
    const n = estado.semanas, pres = r.presencaSemanas.slice(-n), sems = r.semanas.slice(-n);
    const topo = Math.max(10, Math.ceil(Math.max(...pres) * 1.1 / 10) * 10);

    const tarefas = [
      r.aptos && ["graduacoes", "graduacoes", `${r.aptos} aluno${r.aptos === 1 ? "" : "s"} apto${r.aptos === 1 ? "" : "s"} a graduar`, `${r.aptos - r.aptosKids} adultos e ${r.aptosKids} kids, pelas aulas e pelo tempo`],
      r.viramAdultos && ["graduacoes", "alunos", `${r.viramAdultos} criança${r.viramAdultos === 1 ? "" : "s"} fez 16 anos`, `passa${r.viramAdultos === 1 ? "" : "m"} para a turma de Adultos`],
      r.inadimplentes && ["financeiro", "financeiro", `${r.inadimplentes} com mensalidade atrasada`, "cobre pelo WhatsApp ou na recepção"]
    ].filter(Boolean);

    el.innerHTML = cabecalho("Dashboard", "GB Sobradinho – Gestão completa da sua academia") +
      `<section class="stats">
        <a class="stat vermelho" href="#alunos"><div class="stat-topo">${icone("alunos")}${novosMes ? `<span class="pilula boa">↑ +${novosMes} no mês</span>` : ""}</div>
          <div class="stat-rot">Alunos ativos</div><strong>${r.ativos}</strong><div class="stat-pe">${r.ativos - r.kids} adultos · ${r.kids} kids</div>
          <span class="marca-dagua">${icone("alunos")}</span></a>
        <a class="stat" href="#checkins"><div class="stat-topo">${icone("checkins")}</div>
          <div class="stat-rot">Check-ins no mês</div><strong>${r.checkinsMes}</strong><div class="stat-pe">${variacao(r.checkinsMes, r.checkinsMesAnterior)}</div>
          ${spark(r.presencaSemanas, "#e71920")}</a>
        <a class="stat" href="#financeiro"><div class="stat-topo"><span class="ic-dinheiro">$</span></div>
          <div class="stat-rot">Entrou no caixa</div><strong class="dinheiro">${reais(r.recebidoMes)}</strong><div class="stat-pe">pagamentos feitos este mês</div>
          ${spark(caixaSemanas, "#08a34a")}</a>
        <a class="stat" href="#financeiro"><div class="stat-topo">${icone("alerta")}${r.inadimplentes ? `<span class="pilula ruim">${r.inadimplentes} em atraso</span>` : `<span class="pilula boa" style="border:1px solid #cdebd9">em dia</span>`}</div>
          <div class="stat-rot">Inadimplentes</div><strong>${r.inadimplentes}</strong><div class="stat-pe">${r.inadimplentes ? `${r.inadimplentes - r.inadimplentesKids} adultos · ${r.inadimplentesKids} kids` : "tudo em dia"}</div></a>
      </section>

      <section class="dash-meio">
        <article class="card"><div class="card-cab"><div class="titulo-ic">${icone("relatorios")}<h3>Presença nas últimas ${n} semanas</h3></div>
          <select id="periodo" aria-label="Período">${[4, 8].map(x => `<option value="${x}"${x === n ? " selected" : ""}>${x} semanas</option>`).join("")}</select></div>
          <div class="grafico"><div class="eixo">${[0, 1, 2, 3, 4, 5].map(i => `<span style="bottom:${i * 20}%">${Math.round(topo * i / 5)}</span>`).join("")}</div>
            <div class="area"><div class="grade"></div><div class="barras">${pres.map((v, i) => `<div class="col"><div class="bar ${i === pres.length - 1 ? "on" : ""}" style="height:${Math.round(v / topo * 100)}%" title="${v} check-ins"><i>${v}</i></div>` +
              `<small>${i === pres.length - 1 ? "Atual" : sems[i].slice(8) + "/" + sems[i].slice(5, 7)}</small></div>`).join("")}</div></div></div>
        </article>
        <article class="card"><div class="card-cab"><div class="titulo-ic">${icone("agenda")}<h3>Aulas de hoje</h3></div><a class="link" href="#agenda" style="display:flex;align-items:center;gap:5px">Ver agenda ${icone("seta")}</a></div>
          ${r.aulasHoje.length ? `<div class="aulas-hoje">${r.aulasHoje.map(t => {
            const p = presentes(t), tema = temaDaAula(d, t, hoje)[0];
            return `<a class="aula-linha${t.categoria === "kids" ? " kids" : ""}" href="#checkins/${encodeURIComponent(t.id)}"><span class="acento"></span>
              <span class="tempo"><b>${horaTexto(t.horario)}</b><span>${fimDaAula(t)}</span></span><span class="ic-kimono">${icone("kimono")}</span>
              <span class="nome"><b>${esc(nomeDaTurma(t))}</b><small>Prof. ${esc(nomeProfessor(d, t.professorId))}${tema ? ` · ${esc(tema.tema)}` : ""}</small></span>
              <span class="qtd">${icone("alunos")}${p} presente${p === 1 ? "" : "s"}</span><span class="mini-anel" style="--pct:${Math.min(100, Math.round(p / recorde(t) * 100))}%" title="em relação à aula mais cheia desta turma"></span></a>`;
          }).join("")}</div>` : `<div class="vazio">Sem aulas hoje. Bom descanso!</div>`}
        </article>
      </section>

      <section class="dash-rotina">
        <article class="card"><div class="card-cab"><div class="titulo-ic">${icone("relogio")}<h3>Organize sua rotina</h3></div>${(() => { const conta = rot.filter(t => !t.vazio), ok = conta.filter(t => t.ok).length; return `<span class="contador${ok === conta.length ? " ok" : ""}" title="tarefas concluídas">${ok}/${conta.length}</span>`; })()}</div>
          <div class="rotina">${rot.map(t => `<a class="rot${t.ok ? " ok" : ""}${t.vazio ? " vazia" : ""}" href="#${t.rota}"><span class="rot-ic">${t.ok ? '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>' : icone(t.icone)}</span>
            <span class="rot-txt"><small>${t.quando} · ${t.vazio ? t.semNada : `${t.feitas} de ${t.total}`}</small><b>${t.titulo}</b><span class="rot-barra"><i style="width:${t.total ? Math.round(t.feitas / t.total * 100) : 100}%"></i></span></span>
            <svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></a>`).join("")}</div>
        </article>
        <article class="card"><div class="card-cab"><div class="titulo-ic">${icone("relatorios")}<h3>Timeline <span>– últimos 14 dias</span></h3></div><span class="contador cinza">${tempo.length}</span></div>
          <div class="chips-tempo" role="group" aria-label="Filtrar a timeline">${[["", "Tudo"], ...Object.entries(TIPOS_TEMPO)].map(([k, v]) => `<button type="button" data-tipo="${k}" class="${k === estado.tipo ? "on" : ""}" aria-pressed="${k === estado.tipo}">${v}</button>`).join("")}</div>
          ${tempo.length ? `<div class="tempo-lista">${tempo.slice(0, estado.limite).map((x, i, l) => (i === 0 || l[i - 1].data !== x.data ? `<div class="tempo-dia">${diaTexto(x.data, hoje)}</div>` : "") +
            `<a class="tempo-item t-${x.tipo}" href="#${x.rota}"><span class="tempo-ic">${icone(IC_TEMPO[x.tipo])}</span><span class="tempo-txt"><b>${esc(x.titulo)}</b><small>${esc(x.detalhe)}</small></span>${x.hora ? `<time>${horaTexto(x.hora)}</time>` : ""}</a>`).join("")}
            ${tempo.length > estado.limite ? `<button type="button" class="tempo-mais" id="tempo-mais">Ver mais (${tempo.length - estado.limite})</button>` : ""}</div>`
            : `<div class="vazio">Nada por aqui nos últimos 14 dias.</div>`}
        </article>
      </section>

      <section class="dash-base">
        <article class="card"><div class="card-cab"><div class="titulo-ic">${icone("alerta")}<h3>Atenção <span>– ações pendentes</span></h3></div><span class="contador">${tarefas.length}</span></div>
          ${tarefas.length ? `<div class="tarefas">${tarefas.map(([rota, ic, t, s]) => `<a class="tarefa" href="#${rota}"><span class="tarefa-ic">${icone(ic)}</span><span class="tarefa-txt"><b>${t}</b><small>${s}</small></span><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></a>`).join("")}</div>`
            : `<div class="vazio">Tudo em dia!</div>`}
        </article>
        <article class="card"><div class="card-cab"><div class="titulo-ic">${icone("financeiro")}<h3>Mensalidades do mês</h3></div></div>
          <div class="rosca-area"><div class="rosca" style="--pct:${pct}%"><div class="rosca-furo"><strong>${pct}%</strong><span>pagas</span></div></div>
            <div class="legenda-r"><div><i class="ponto-v"></i>Pagas <b>${pagas}</b></div><div><i class="ponto-c"></i>Em aberto <b>${doMes.length - pagas}</b></div><div>Total <b>${doMes.length}</b></div></div></div>
        </article>
        <article class="card"><div class="card-cab"><div class="titulo-ic">${icone("presente")}<h3>Aniversariantes do mês</h3></div><span class="contador">${r.aniversariantes.length}</span></div>
          ${r.aniversariantes.length ? `<div class="nivers">${r.aniversariantes.map(a => {
            const ehHoje = Number(a.nascimento.slice(8)) === dia && Number(a.nascimento.slice(5, 7)) === mes;
            return `<a class="niver${ehHoje ? " hoje" : ""}" href="#aluno/${encodeURIComponent(a.id)}"><span class="iniciais">${esc(iniciais(a.nome))}</span><span class="quem"><b>${esc(a.nome)}</b><small>${a.nascimento.slice(8)}/${a.nascimento.slice(5, 7)}${ehHoje ? " – é hoje! 🎉" : ""}</small></span><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></a>`;
          }).join("")}</div>` : `<div class="vazio">Ninguém faz aniversário este mês.</div>`}
        </article>
      </section>`;

    // Filtro e "ver mais" redesenham a tela sem pular para o topo.
    const noLugar = muda => () => { const y = window.scrollY; muda(); ctx.redesenhar(); window.scrollTo(0, y); };
    for (const b of el.querySelectorAll(".chips-tempo button")) b.onclick = noLugar(() => { estado.tipo = b.dataset.tipo; estado.limite = 25; });
    const mais = el.querySelector("#tempo-mais");
    if (mais) mais.onclick = noLugar(() => { estado.limite += 25; });
    el.querySelector("#periodo").onchange = e => { estado.semanas = Number(e.target.value); ctx.redesenhar(); };
  }
};
