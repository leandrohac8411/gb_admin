// Financeiro: mensalidades por mês, totais, marcar como pago e novos lançamentos.
import { esc, abrirFolha, toast, dataLonga, perguntar } from "../ui/util.js";
import { reais, anelClaroSVG, competenciaTexto, somarMeses } from "../ui/util-admin.js";
import { hojeISO, dataValida } from "../logica/datas.js";
import { resumoFinanceiro, statusMensalidade } from "../logica/financeiro.js";
import { icone } from "../menu.js";
import { cabecalho, pessoa, porId, PILL_STATUS, aba, daAba, abasCategoria, ligarAbas } from "./comum.js";
import { fluxoDoMes, CATEGORIAS_DESPESA } from "../logica/caixa.js";

const estado = { comp: null, filtro: "Todos", visao: "Mensalidades" };
const FORMAS = ["Pix", "Cartão", "Dinheiro"];

function abrirPagamento(store, m, aluno, aoSalvar) {
  const hoje = hojeISO();
  let forma = "Pix";
  abrirFolha((el, fechar) => {
    el.innerHTML = `<h3>Marcar como pago</h3><p class="muted" style="margin:0">${esc(aluno?.nome || "")} · ${competenciaTexto(m.competencia)} · <b>${reais(m.valor)}</b></p>
      <div class="field"><label for="p-data">Pago em</label><input class="input" type="date" id="p-data" value="${hoje}" max="${hoje}"></div>
      <div class="field"><label>Forma</label><div class="chips">${FORMAS.map(f => `<button type="button" class="chip${f === forma ? " on" : ""}" data-f="${f}">${f}</button>`).join("")}</div></div>
      <p class="aviso" id="p-erro" hidden></p>
      <div class="acoes"><button class="btn ghost" id="p-cancelar">Cancelar</button><button class="btn" id="p-ok">Confirmar</button></div>`;
    el.querySelectorAll("[data-f]").forEach(b => b.onclick = () => { forma = b.dataset.f; el.querySelectorAll("[data-f]").forEach(c => c.classList.toggle("on", c === b)); });
    el.querySelector("#p-cancelar").onclick = fechar;
    el.querySelector("#p-ok").onclick = () => {
      const data = el.querySelector("#p-data").value;
      if (!dataValida(data) || data > hoje) { const e = el.querySelector("#p-erro"); e.textContent = "Data de pagamento inválida."; e.hidden = false; return; }
      Object.assign(m, { pagoEm: data, forma });
      store.salvar(); fechar(); toast("Pagamento registrado"); aoSalvar();
    };
  });
}

function abrirLancamento(store, comp, aoSalvar) {
  const d = store.dados, ativos = d.alunos.filter(a => a.status === "ativo" && daAba(a)).sort((x, y) => x.nome.localeCompare(y.nome, "pt-BR"));
  abrirFolha((el, fechar) => {
    el.innerHTML = `<h3>Novo lançamento</h3><p class="muted" style="margin:0">Mensalidade de ${competenciaTexto(comp)}</p>
      <form class="campos" novalidate>
        <div class="field cheio"><label for="l-aluno">Aluno</label><select class="input" id="l-aluno">${ativos.map(a => `<option value="${esc(a.id)}">${esc(a.nome)} · ${esc(a.plano)}</option>`).join("")}</select></div>
        <div class="field"><label for="l-venc">Vencimento</label><input class="input" type="date" id="l-venc" value="${comp}-10"></div>
        <div class="field"><label for="l-valor">Valor (R$)</label><input class="input" type="number" inputmode="decimal" min="1" step="0.01" id="l-valor"></div>
        <p class="aviso cheio" id="l-erro" hidden></p>
        <div class="acoes cheio"><button type="button" class="btn ghost" id="l-cancelar">Cancelar</button><button class="btn" type="submit">Lançar</button></div>
      </form>`;
    const sel = el.querySelector("#l-aluno"), valor = el.querySelector("#l-valor"), erro = el.querySelector("#l-erro");
    const preencher = () => { valor.value = d.alunos.find(a => a.id === sel.value)?.valor ?? ""; };
    sel.onchange = preencher; preencher();
    el.querySelector("#l-cancelar").onclick = fechar;
    el.querySelector("form").onsubmit = e => {
      e.preventDefault();
      const venc = el.querySelector("#l-venc").value, v = Number(valor.value);
      const falha = !sel.value ? "Escolha o aluno." : !dataValida(venc) ? "Vencimento inválido." : !(v > 0) ? "Informe um valor maior que zero."
        : d.mensalidades.some(m => m.alunoId === sel.value && m.competencia === comp) ? "Esse aluno já tem mensalidade neste mês." : "";
      if (falha) { erro.textContent = falha; erro.hidden = false; return; }
      d.mensalidades.push({ id: store.novoId("m"), alunoId: sel.value, competencia: comp, vencimento: venc, valor: v, pagoEm: null, forma: null });
      store.salvar(); fechar(); toast("Mensalidade lançada"); aoSalvar();
    };
  });
}

function abrirDespesa(store, comp, aoSalvar) {
  const hoje = hojeISO(), padrao = comp === hoje.slice(0, 7) ? hoje : `${comp}-05`;
  abrirFolha((el, fechar) => {
    el.innerHTML = `<h3>Nova despesa</h3><form class="campos" novalidate>
      <div class="field cheio"><label for="dp-desc">Descrição</label><input class="input" id="dp-desc" placeholder="Ex.: conta de luz"></div>
      <div class="field"><label for="dp-cat">Categoria</label><select class="input" id="dp-cat">${CATEGORIAS_DESPESA.map(c => `<option>${c}</option>`).join("")}</select></div>
      <div class="field"><label for="dp-valor">Valor (R$)</label><input class="input" type="number" min="0.01" step="0.01" inputmode="decimal" id="dp-valor"></div>
      <div class="field"><label for="dp-data">Data</label><input class="input" type="date" id="dp-data" value="${padrao}"></div>
      <label class="check" style="align-self:end"><input type="checkbox" id="dp-pago"${padrao <= hoje ? " checked" : ""}> Já foi paga</label>
      <p class="aviso cheio" id="dp-erro" hidden></p>
      <div class="acoes cheio"><button type="button" class="btn ghost" id="dp-x">Cancelar</button><button class="btn">Lançar</button></div></form>`;
    el.querySelector("#dp-x").onclick = fechar;
    el.querySelector("form").onsubmit = e => {
      e.preventDefault();
      const descricao = el.querySelector("#dp-desc").value.trim(), valor = Number(el.querySelector("#dp-valor").value), data = el.querySelector("#dp-data").value;
      const erro = msg => { const x = el.querySelector("#dp-erro"); x.textContent = msg; x.hidden = false; };
      if (descricao.length < 3) return erro("Descreva a despesa.");
      if (!(valor > 0)) return erro("Informe um valor maior que zero.");
      if (!dataValida(data)) return erro("Data inválida.");
      store.dados.despesas.push({ id: store.novoId("dp"), data, categoria: el.querySelector("#dp-cat").value, descricao, valor, pago: el.querySelector("#dp-pago").checked });
      store.salvar(); fechar(); toast("Despesa lançada"); aoSalvar();
    };
  });
}

function fluxoDeCaixa(el, ctx, comp, hoje, kpi) {
  const { store } = ctx, d = store.dados, f = fluxoDoMes(d, comp);
  const meses = [somarMeses(comp, -2), somarMeses(comp, -1), comp].map(c => ({ c, ...fluxoDoMes(d, c) }));
  const max = Math.max(1, ...meses.flatMap(m => [m.entradas, m.saidas]));
  const despesas = d.despesas.filter(x => x.data.startsWith(comp)).sort((a, b) => a.data.localeCompare(b.data));
  return `<div class="kpis">
      ${kpi("Entradas", reais(f.entradas), "mensalidades pagas no mês", "destaque")}
      ${kpi("Saídas", reais(f.saidas), `${despesas.length} despesas`)}
      ${kpi("Saldo do mês", reais(f.saldo), f.saldo >= 0 ? "sobrou no caixa" : "faltou no caixa", f.saldo < 0 ? "ruim" : "")}
      ${kpi("A pagar", reais(f.saidas - f.saidasPagas), "despesas em aberto")}
    </div>
    <div class="grade2">
      <div class="card"><div class="card-cab"><h3>Entradas × saídas</h3><small>últimos 3 meses</small></div>
        <div class="barras duplas">${meses.map(m => `<div class="col"><div class="par"><div class="bar ent" style="height:${Math.round(m.entradas / max * 100)}%"><i>${Math.round(m.entradas / 1000)}k</i></div>
          <div class="bar sai" style="height:${Math.round(m.saidas / max * 100)}%"><i>${Math.round(m.saidas / 1000)}k</i></div></div><small>${competenciaTexto(m.c).split(" ")[0].slice(0, 3)}</small></div>`).join("")}</div>
        <div class="legenda"><span><i class="ent"></i>Entradas</span><span><i class="sai"></i>Saídas</span></div></div>
      <div class="card"><div class="card-cab"><h3>Para onde vai o dinheiro</h3><small>${competenciaTexto(comp)}</small></div>
        ${f.porCategoria.length ? `<div class="dist valores">${f.porCategoria.map(c => `<div class="linha"><span>${esc(c.categoria)}</span><div class="trilho"><i style="width:${Math.round(c.valor / f.saidas * 100)}%;background:var(--red)"></i></div><span style="min-width:70px;text-align:right">${reais(c.valor)}</span></div>`).join("")}</div>`
          : `<div class="vazio">Nenhuma despesa neste mês.</div>`}</div>
    </div>
    <div class="card"><div class="card-cab"><h3>Despesas de ${competenciaTexto(comp).toLowerCase()}</h3><button class="btn peq" id="nova-despesa">${icone("financeiro")}Nova despesa</button></div>
      ${despesas.length ? `<table class="tabela resp"><thead><tr><th>Despesa</th><th>Categoria</th><th>Data</th><th class="num">Valor</th><th>Status</th><th></th></tr></thead><tbody>${despesas.map(x => `<tr>
        <td class="cheia"><b>${esc(x.descricao)}</b></td><td>${esc(x.categoria)}</td><td data-l="Data:">${dataLonga(x.data)}</td><td class="num"><b>${reais(x.valor)}</b></td>
        <td>${x.pago ? '<span class="pill ok">Paga</span>' : x.data < hoje ? '<span class="pill ruim">Vencida</span>' : '<span class="pill alerta">A pagar</span>'}</td>
        <td class="num">${x.pago ? "" : `<button class="btn sec peq" data-paga="${esc(x.id)}">Marcar paga</button> `}<button class="btn sec peq" data-del="${esc(x.id)}" aria-label="Excluir ${esc(x.descricao)}">Excluir</button></td></tr>`).join("")}</tbody></table>`
        : `<div class="vazio">Nenhuma despesa lançada neste mês.</div>`}</div>`;
}

export default {
  titulo: "Financeiro",
  montar(el, params, ctx) {
    const { store } = ctx, d = store.dados, hoje = hojeISO();
    if (!estado.comp) estado.comp = hoje.slice(0, 7);
    const comp = estado.comp;
    const kpi = (rotulo, valor, sub, classe = "") => `<div class="kpi ${classe}"><div class="kpi-top"><span>${rotulo}</span></div><b>${valor}</b><small>${sub}</small></div>`;
    const seletorMes = `<div class="card" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <button class="btn sec peq" id="ant" aria-label="Mês anterior">‹</button><b style="min-width:130px;text-align:center">${competenciaTexto(comp)}</b>
        <button class="btn sec peq" id="prox" aria-label="Próximo mês">›</button>
        ${comp !== hoje.slice(0, 7) ? `<button class="link" id="atual">Mês atual</button>` : ""}
        <div class="chips" style="margin-left:auto">${["Mensalidades", "Fluxo de caixa"].map(v => `<button class="chip${estado.visao === v ? " on" : ""}" data-visao="${v}">${v}</button>`).join("")}</div>
      </div>`;
    const ligarComum = () => {
      el.querySelector("#ant").onclick = () => { estado.comp = somarMeses(comp, -1); ctx.redesenhar(); };
      el.querySelector("#prox").onclick = () => { estado.comp = somarMeses(comp, 1); ctx.redesenhar(); };
      el.querySelector("#atual")?.addEventListener("click", () => { estado.comp = hoje.slice(0, 7); ctx.redesenhar(); });
      el.querySelectorAll("[data-visao]").forEach(b => b.onclick = () => { estado.visao = b.dataset.visao; ctx.redesenhar(); });
    };

    if (estado.visao === "Fluxo de caixa") {
      el.innerHTML = cabecalho("Financeiro", "Entradas e saídas da academia toda (valores fictícios).") + seletorMes + fluxoDeCaixa(el, ctx, comp, hoje, kpi);
      ligarComum();
      el.querySelector("#nova-despesa").onclick = () => abrirDespesa(store, comp, ctx.redesenhar);
      el.querySelectorAll("[data-paga]").forEach(b => b.onclick = () => { const x = d.despesas.find(y => y.id === b.dataset.paga); x.pago = true; store.salvar(); toast("Despesa paga"); ctx.redesenhar(); });
      el.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => {
        const x = d.despesas.find(y => y.id === b.dataset.del);
        if (!await perguntar("Excluir despesa?", `${x.descricao} · ${reais(x.valor)}`, "Excluir", "Cancelar")) return;
        d.despesas = d.despesas.filter(y => y !== x); store.salvar(); toast("Despesa excluída"); ctx.redesenhar();
      });
      return;
    }

    const alunosAba = d.alunos.filter(daAba), alunos = porId(d.alunos), ids = new Set(alunosAba.filter(a => a.status === "ativo").map(a => a.id));
    const r = resumoFinanceiro(d.mensalidades, alunosAba, comp, hoje);
    const emAtraso = d.mensalidades.filter(m => ids.has(m.alunoId) && statusMensalidade(m, hoje) === "atrasado");
    const doMes = d.mensalidades.filter(m => m.competencia === comp && ids.has(m.alunoId));
    const visiveis = (estado.filtro === "Em atraso (todos os meses)" ? emAtraso
      : doMes.filter(m => estado.filtro === "Todos" || statusMensalidade(m, hoje) === estado.filtro.toLowerCase()))
      .sort((x, y) => x.vencimento.localeCompare(y.vencimento) || (alunos[x.alunoId]?.nome || "").localeCompare(alunos[y.alunoId]?.nome || "", "pt-BR"));
    const kids = aba() === "kids";

    el.innerHTML = cabecalho("Financeiro", "Mensalidades e recebimentos (valores fictícios).", `<button class="btn" id="lancar">${icone("financeiro")}Novo lançamento</button>`) +
      seletorMes + abasCategoria(d) +
      `<div class="resumo-fin">
        <div class="kpis">
          ${kpi("Previsto", reais(r.previsto), `${doMes.length} mensalidades`)}
          ${kpi("Recebido", reais(r.recebido), `das mensalidades de ${competenciaTexto(comp).split(" ")[0].toLowerCase()}`, "destaque")}
          ${kpi("Pendente", reais(r.pendente), "a vencer")}
          ${kpi("Atrasado", reais(r.atrasado), `${r.inadimplentes.length} ${kids ? "criança" : "aluno"}${r.inadimplentes.length === 1 ? "" : "s"}`, r.atrasado ? "ruim" : "")}
        </div>
        <div class="card" style="display:flex;align-items:center;gap:20px">
          <div class="anel">${anelClaroSVG(r.previsto ? r.recebido / r.previsto : 0, "#009b45")}<b>${r.previsto ? Math.round(r.recebido / r.previsto * 100) : 0}%<small>recebido</small></b></div>
          <div><h3 style="font-size:15px">${reais(r.recebido)} de ${reais(r.previsto)}</h3>
          <p class="muted" style="margin:6px 0 0">${emAtraso.length ? `${emAtraso.length} mensalidade${emAtraso.length === 1 ? "" : "s"} em atraso somando todos os meses.` : "Nenhuma mensalidade em atraso."}</p></div>
        </div>
      </div>
      <div class="card">
        <div class="chips" id="filtros" style="margin-bottom:10px">${["Todos", "Pago", "Pendente", "Atrasado", "Em atraso (todos os meses)"].map(f => `<button class="chip${estado.filtro === f ? " on" : ""}" data-f="${f}">${f}</button>`).join("")}</div>
        ${visiveis.length ? `<table class="tabela resp"><thead><tr><th>${kids ? "Criança · responsável" : "Aluno"}</th><th>Mês</th><th>Vencimento</th><th class="num">Valor</th><th>Status</th><th></th></tr></thead><tbody>${visiveis.map(m => {
          const a = alunos[m.alunoId], s = statusMensalidade(m, hoje);
          const sub = a?.categoria === "kids" ? `resp.: ${esc(a.responsavel?.nome || "—")}` : esc(a?.plano || "");
          return `<tr><td class="cheia">${a ? `<a href="#aluno/${encodeURIComponent(a.id)}">${pessoa(a, sub)}</a>` : "—"}</td><td class="${estado.filtro.startsWith("Em atraso") ? "" : "esconde-m"}" data-l="Mês:">${competenciaTexto(m.competencia)}</td>
            <td data-l="Vence:">${dataLonga(m.vencimento)}</td><td class="num"><b>${reais(m.valor)}</b></td><td>${PILL_STATUS[s]}${m.pagoEm ? `<br><small class="muted">${dataLonga(m.pagoEm)} · ${esc(m.forma || "")}</small>` : ""}</td>
            <td class="num">${s === "pago" ? "" : `<button class="btn sec peq" data-pagar="${esc(m.id)}">Marcar pago</button>`}</td></tr>`;
        }).join("")}</tbody></table>` : `<div class="vazio">Nenhuma mensalidade com esse filtro.</div>`}
      </div>`;

    ligarComum();
    ligarAbas(el, ctx);
    el.querySelector("#lancar").onclick = () => abrirLancamento(store, comp, ctx.redesenhar);
    el.querySelectorAll("[data-f]").forEach(b => b.onclick = () => { estado.filtro = b.dataset.f; ctx.redesenhar(); });
    el.querySelectorAll("[data-pagar]").forEach(b => b.onclick = () => {
      const m = d.mensalidades.find(x => x.id === b.dataset.pagar);
      if (m) abrirPagamento(store, m, alunos[m.alunoId], ctx.redesenhar);
    });
  }
};
