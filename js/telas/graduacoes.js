// Graduações: abas Adultos | Kids, quem está apto (aulas + tempo; kids também idade), distribuição por faixa,
// graduar, passar de Kids para Adultos e histórico.
import { esc, perguntar, toast, dataLonga } from "../ui/util.js";
import { faixaSVG, nomeFaixa, faixasDe, CORES_FAIXA, corBase } from "../ui/faixa.js";
import { hojeISO } from "../logica/datas.js";
import { aptidao, regrasDe, mesesEntre, idadeEm, passaParaAdulto, REGRAS, REGRAS_KIDS, progressoGraduacao } from "../logica/graduacao.js";
import { cabecalho, pessoa, faixaCelula, porId, aba, daAba, abasCategoria, ligarAbas, anosTexto, estrelas } from "./comum.js";
import { mediaComportamento } from "../logica/familia.js";

const estado = { aba: "Aptos" };

function situacao(a, apt, hoje) {
  const R = regrasDe(a), kids = a.categoria === "kids";
  if (a.faixa === "preta") return '<span class="pill">Faixa preta</span>';
  if (passaParaAdulto(a, hoje)) return '<span class="pill alerta">Passa para Adultos</span>';
  if (apt.tipo === "faixa") return `<span class="pill ok">Apto à ${nomeFaixa(apt.proximaFaixa).toLowerCase()}</span>`;
  if (apt.tipo === "grau") return `<span class="pill ok">Apto ao ${a.graus + 1}º grau</span>`;
  if (apt.faltamAulas) return `<span class="pill">Faltam ${apt.faltamAulas} aulas</span>`;
  if (a.graus === 4) {
    const lista = faixasDe(a.categoria), prox = lista[lista.indexOf(a.faixa) + 1];
    if (!prox) return '<span class="pill">Última faixa kids</span>';
    const minMeses = kids ? R.mesesMinFaixa : null;
    if (kids && mesesEntre(a.desdeFaixa, hoje) < minMeses) return `<span class="pill alerta">Aguardando tempo (${mesesEntre(a.desdeFaixa, hoje)}/${minMeses} meses)</span>`;
    if (kids) return `<span class="pill alerta">Aguardando idade (${idadeEm(a.nascimento, hoje) ?? "?"}/${R.idadeMin[corBase(prox)]} anos)</span>`;
  }
  return apt.dataPrevista ? `<span class="pill alerta">Previsto para ${dataLonga(apt.dataPrevista)}</span>` : '<span class="pill alerta">Aguardando tempo</span>';
}

// Ao virar adulto, faixa kids vira branca (ou azul se já é verde) — regra simplificada da vitrine.
const faixaAdulta = f => (corBase(f) === "verde" ? "azul" : "branca");

export default {
  titulo: "Graduações",
  montar(el, params, ctx) {
    const { store } = ctx, d = store.dados, hoje = hojeISO(), kids = aba() === "kids", R = kids ? REGRAS_KIDS : REGRAS;
    const ativos = d.alunos.filter(a => a.status === "ativo" && daAba(a));
    const lista = ativos.map(a => ({ a, apt: aptidao(a, d.checkins, hoje) }));
    const aptos = lista.filter(x => x.apt.tipo).sort((x, y) => (x.apt.tipo === "faixa" ? -1 : 0) - (y.apt.tipo === "faixa" ? -1 : 0) || y.apt.aulas - x.apt.aulas);
    const viramAdultos = kids ? ativos.filter(a => passaParaAdulto(a, hoje)) : [];
    const faixas = faixasDe(aba());
    const porFaixa = faixas.map(f => [f, ativos.filter(a => a.faixa === f).length]);
    const maxF = Math.max(1, ...porFaixa.map(([, n]) => n));
    const alunos = porId(d.alunos);
    const regraTexto = kids
      ? `Regra kids: grau mensal (${R.mesesPorGrau === 1 ? "a cada mês" : `a cada ${R.mesesPorGrau} meses`}, com pelo menos ${R.aulasPorGrau} aula${R.aulasPorGrau === 1 ? "" : "s"} no período); troca de faixa com 4 graus, ${R.mesesMinFaixa} meses na faixa e idade mínima da cor (cinza ${R.idadeMin.cinza}, amarela ${R.idadeMin.amarela}, laranja ${R.idadeMin.laranja}, verde ${R.idadeMin.verde} anos).`
      : `Regra adulto: o tempo de cada faixa (${["branca", "azul", "roxa", "marrom"].map(f => `${f} ${R.mesesFaixa[f]} meses`).join(", ")}) é dividido em 4 graus + a troca de faixa, com as aulas proporcionais (base de ${R.treinosPorSemana} treinos por semana, ${R.folgaPct}% de folga para recesso e feriados).`;

    const cartaoVirarAdulto = viramAdultos.length ? `<div class="card" style="border-color:#f0d39a;background:#fffaf0">
        <div class="card-cab"><div><h3>Passam para Adultos</h3><small>completaram ${REGRAS_KIDS.idadeAdulto} anos</small></div></div>
        <div class="lista">${viramAdultos.map(a => `<div>${pessoa(a, `${anosTexto(idadeEm(a.nascimento, hoje))} · ${nomeFaixa(a.faixa)}`)}
          <div class="promo" style="margin-left:auto">${faixaSVG(a.faixa, a.graus, { mini: true })}<span class="seta">→</span>${faixaSVG(faixaAdulta(a.faixa), 0, { mini: true })}</div>
          <button class="btn peq" data-adulto="${esc(a.id)}">Passar para Adultos</button></div>`).join("")}</div></div>` : "";

    const conteudo = estado.aba === "Aptos"
      ? (aptos.length ? `<div class="grade3">${aptos.map(({ a, apt }) => {
          const nova = apt.tipo === "faixa" ? { faixa: apt.proximaFaixa, graus: 0 } : { faixa: a.faixa, graus: a.graus + 1 };
          return `<div class="card" style="display:flex;flex-direction:column;gap:12px">
            <a href="#aluno/${encodeURIComponent(a.id)}">${pessoa(a, `${kids ? `${anosTexto(idadeEm(a.nascimento, hoje))} · ` : ""}${apt.aulas} aulas desde ${dataLonga(a.ultimaGraduacao)}`)}</a>
            <div class="promo">${faixaSVG(a.faixa, a.graus)}<span class="seta">→</span>${faixaSVG(nova.faixa, nova.graus)}</div>
            ${kids ? (() => { const m = mediaComportamento(d.avaliacoes || [], a.id); return m == null ? '<small class="muted">Sem avaliação de comportamento</small>'
              : `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><small class="muted">Comportamento</small>${estrelas(m)}<b style="font-size:13px">${String(m).replace(".", ",")}</b>${m < 3 ? '<span class="pill alerta">abaixo de 3</span>' : ""}</div>`; })() : ""}
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">${situacao(a, apt, hoje)}
              <button class="btn peq" data-graduar="${esc(a.id)}">${apt.tipo === "faixa" ? "Trocar faixa" : "Dar grau"}</button></div></div>`;
        }).join("")}</div>` : `<div class="card vazio">Ninguém apto agora. ${regraTexto}</div>`)
      : estado.aba === "Todos"
      ? `<div class="card">${lista.length ? `<table class="tabela resp"><thead><tr><th>${kids ? "Criança" : "Aluno"}</th><th>Faixa</th><th>Aulas p/ próximo grau</th><th>Situação</th></tr></thead><tbody>${lista
          .sort((x, y) => faixas.indexOf(y.a.faixa) - faixas.indexOf(x.a.faixa) || y.a.graus - x.a.graus || x.a.nome.localeCompare(y.a.nome, "pt-BR"))
          .map(({ a, apt }) => `<tr class="clica" data-id="${esc(a.id)}"><td class="cheia">${pessoa(a, kids ? anosTexto(idadeEm(a.nascimento, hoje)) : "")}</td><td>${faixaCelula(a)}</td>
            <td style="min-width:140px">${a.faixa === "preta" ? "—" : `${(pg => `<div class="progresso ${apt.faltamAulas ? "" : "ok"}"><i style="width:${Math.min(100, Math.round(pg.feitas / (pg.necessarias || 1) * 100))}%"></i></div><small class="muted">${Math.min(pg.feitas, pg.necessarias)}/${pg.necessarias}</small>`)(progressoGraduacao(a, apt))}`}</td>
            <td>${situacao(a, apt, hoje)}</td></tr>`).join("")}</tbody></table>` : `<div class="vazio">Nenhum aluno ativo nesta aba.</div>`}</div>`
      : (() => {
          const hist = [...d.graduacoes].filter(g => alunos[g.alunoId] && daAba(alunos[g.alunoId])).sort((x, y) => y.data.localeCompare(x.data)).slice(0, 40);
          return `<div class="card">${hist.length ? `<div class="lista">${hist.map(g => `<div>${faixaSVG(g.faixa, g.graus, { mini: true })}<div class="cresce"><b>${esc(alunos[g.alunoId].nome)}</b><small>${nomeFaixa(g.faixa)}${g.graus ? ` · ${g.graus}º grau` : ""}</small></div><span class="muted">${dataLonga(g.data)}</span></div>`).join("")}</div>`
            : `<div class="vazio">Nenhuma graduação registrada.</div>`}</div>`;
        })();

    el.innerHTML = cabecalho("Graduações", regraTexto) + abasCategoria(d) + cartaoVirarAdulto +
      `<div class="grade2">
        <div class="card"><div class="card-cab"><h3>${kids ? "Crianças" : "Alunos"} ativos por faixa</h3><small>${ativos.length} ativos</small></div>
          <div class="dist">${porFaixa.map(([f, n]) => `<div class="linha"${kids ? ' style="grid-template-columns:120px 1fr 34px"' : ""}><span>${nomeFaixa(f)}</span><div class="trilho"><i style="width:${Math.round(n / maxF * 100)}%;background:${CORES_FAIXA[f]}${f.includes("-") ? `;background-image:linear-gradient(transparent 38%,${f.endsWith("branca") ? "#fff" : "#111"} 38% 62%,transparent 62%)` : ""}"></i></div><span>${n}</span></div>`).join("")}</div></div>
        <div class="kpis kpis2">
          <div class="kpi destaque"><div class="kpi-top"><span>Aptos agora</span></div><b>${aptos.length}</b><small>${aptos.filter(x => x.apt.tipo === "faixa").length} para troca de faixa</small></div>
          <div class="kpi"><div class="kpi-top"><span>Graduações no ano</span></div><b>${d.graduacoes.filter(g => g.data.startsWith(hoje.slice(0, 4)) && alunos[g.alunoId] && daAba(alunos[g.alunoId])).length}</b><small>graus e faixas em ${hoje.slice(0, 4)}</small></div>
        </div>
      </div>
      <div class="chips" id="sub-abas">${["Aptos", "Todos", "Histórico"].map(t => `<button class="chip${estado.aba === t ? " on" : ""}" data-sub="${t}">${t}${t === "Aptos" ? ` · ${aptos.length}` : ""}</button>`).join("")}</div>
      ${conteudo}`;

    ligarAbas(el, ctx);
    el.querySelectorAll("[data-sub]").forEach(b => b.onclick = () => { estado.aba = b.dataset.sub; ctx.redesenhar(); });
    el.querySelectorAll("tr[data-id]").forEach(tr => tr.onclick = () => ctx.ir(`aluno/${encodeURIComponent(tr.dataset.id)}`));
    el.querySelectorAll("[data-graduar]").forEach(b => b.onclick = async () => {
      const a = d.alunos.find(x => x.id === b.dataset.graduar), apt = aptidao(a, d.checkins, hoje);
      if (!apt.tipo) return;
      const texto = apt.tipo === "faixa" ? `${a.nome} passa para a faixa ${nomeFaixa(apt.proximaFaixa).toLowerCase()}.` : `${a.nome} recebe o ${a.graus + 1}º grau na faixa ${nomeFaixa(a.faixa).toLowerCase()}.`;
      if (!await perguntar("Confirmar graduação?", texto, "Graduar", "Cancelar")) return;
      if (apt.tipo === "faixa") Object.assign(a, { faixa: apt.proximaFaixa, graus: 0, desdeFaixa: hoje });
      else a.graus += 1;
      a.ultimaGraduacao = hoje;
      d.graduacoes.push({ alunoId: a.id, data: hoje, faixa: a.faixa, graus: a.graus });
      store.salvar(); toast(`Parabéns, ${a.nome.split(" ")[0]}! 🥋`); ctx.redesenhar();
    });
    el.querySelectorAll("[data-adulto]").forEach(b => b.onclick = async () => {
      const a = d.alunos.find(x => x.id === b.dataset.adulto), nova = faixaAdulta(a.faixa);
      if (!await perguntar("Passar para Adultos?", `${a.nome} sai das turmas kids e começa como faixa ${nova} na turma de adultos. O plano passa para Mensal.`, "Passar", "Cancelar")) return;
      const mensal = d.planos.find(p => p.id === "Mensal");
      Object.assign(a, { categoria: "adulto", faixa: nova, graus: 0, desdeFaixa: hoje, ultimaGraduacao: hoje, plano: mensal?.id || a.plano, valor: mensal?.valor ?? a.valor });
      d.graduacoes.push({ alunoId: a.id, data: hoje, faixa: nova, graus: 0 });
      d.mensalidades.filter(m => m.alunoId === a.id && !m.pagoEm && m.competencia >= hoje.slice(0, 7)).forEach(m => { m.valor = a.valor; });
      store.salvar(); toast(`${a.nome.split(" ")[0]} agora treina com os adultos!`); ctx.redesenhar();
    });
  }
};
