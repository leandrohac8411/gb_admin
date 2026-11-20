// Financeiro: mensalidades por mês, totais, marcar como pago e novos lançamentos.
import { esc, abrirFolha, toast, dataLonga } from "../ui/util.js";
import { reais, anelClaroSVG, competenciaTexto, somarMeses } from "../ui/util-admin.js";
import { hojeISO, dataValida } from "../logica/datas.js";
import { resumoFinanceiro, statusMensalidade } from "../logica/financeiro.js";
import { icone } from "../menu.js";
import { cabecalho, pessoa, porId, PILL_STATUS } from "./comum.js";

const estado = { comp: null, filtro: "Todos" };
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
  const d = store.dados, ativos = d.alunos.filter(a => a.status === "ativo").sort((x, y) => x.nome.localeCompare(y.nome, "pt-BR"));
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

export default {
  titulo: "Financeiro",
  montar(el, params, ctx) {
    const { store } = ctx, d = store.dados, hoje = hojeISO();
    if (!estado.comp) estado.comp = hoje.slice(0, 7);
    const comp = estado.comp, r = resumoFinanceiro(d.mensalidades, d.alunos, comp, hoje);
    const alunos = porId(d.alunos), ativo = id => alunos[id]?.status === "ativo";
    const emAtraso = d.mensalidades.filter(m => ativo(m.alunoId) && statusMensalidade(m, hoje) === "atrasado");
    const doMes = d.mensalidades.filter(m => m.competencia === comp && ativo(m.alunoId));
    const visiveis = (estado.filtro === "Em atraso (todos os meses)" ? emAtraso
      : doMes.filter(m => estado.filtro === "Todos" || statusMensalidade(m, hoje) === estado.filtro.toLowerCase()))
      .sort((x, y) => x.vencimento.localeCompare(y.vencimento) || (alunos[x.alunoId]?.nome || "").localeCompare(alunos[y.alunoId]?.nome || "", "pt-BR"));
    const kpi = (rotulo, valor, sub, classe = "") => `<div class="kpi ${classe}"><div class="kpi-top"><span>${rotulo}</span></div><b>${valor}</b><small>${sub}</small></div>`;

    el.innerHTML = cabecalho("Financeiro", "Mensalidades e recebimentos (valores fictícios).", `<button class="btn" id="lancar">${icone("financeiro")}Novo lançamento</button>`) +
      `<div class="card" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <button class="btn sec peq" id="ant" aria-label="Mês anterior">‹</button><b style="min-width:130px;text-align:center">${competenciaTexto(comp)}</b>
        <button class="btn sec peq" id="prox" aria-label="Próximo mês">›</button>
        ${comp !== hoje.slice(0, 7) ? `<button class="link" id="atual">Mês atual</button>` : ""}
      </div>
      <div class="grade2">
        <div class="kpis" style="grid-template-columns:1fr 1fr">
          ${kpi("Previsto", reais(r.previsto), `${doMes.length} mensalidades`)}
          ${kpi("Recebido", reais(r.recebido), "já pago", "destaque")}
          ${kpi("Pendente", reais(r.pendente), "a vencer")}
          ${kpi("Atrasado", reais(r.atrasado), `${r.inadimplentes.length} aluno${r.inadimplentes.length === 1 ? "" : "s"}`, r.atrasado ? "ruim" : "")}
        </div>
        <div class="card" style="display:flex;align-items:center;gap:20px">
          <div class="anel">${anelClaroSVG(r.previsto ? r.recebido / r.previsto : 0, "#1f8a5b")}<b>${r.previsto ? Math.round(r.recebido / r.previsto * 100) : 0}%<small>recebido</small></b></div>
          <div><h3 style="font-size:15px">${reais(r.recebido)} de ${reais(r.previsto)}</h3>
          <p class="muted" style="margin:6px 0 0">${emAtraso.length ? `${emAtraso.length} mensalidade${emAtraso.length === 1 ? "" : "s"} em atraso somando todos os meses.` : "Nenhuma mensalidade em atraso."}</p></div>
        </div>
      </div>
      <div class="card">
        <div class="chips" id="filtros" style="margin-bottom:10px">${["Todos", "Pago", "Pendente", "Atrasado", "Em atraso (todos os meses)"].map(f => `<button class="chip${estado.filtro === f ? " on" : ""}" data-f="${f}">${f}</button>`).join("")}</div>
        ${visiveis.length ? `<table class="tabela resp"><thead><tr><th>Aluno</th><th>Mês</th><th>Vencimento</th><th class="num">Valor</th><th>Status</th><th></th></tr></thead><tbody>${visiveis.map(m => {
          const a = alunos[m.alunoId], s = statusMensalidade(m, hoje);
          return `<tr><td class="cheia">${a ? `<a href="#aluno/${encodeURIComponent(a.id)}">${pessoa(a, esc(a.plano))}</a>` : "—"}</td><td class="esconde-m">${competenciaTexto(m.competencia)}</td>
            <td data-l="Vence:">${dataLonga(m.vencimento)}</td><td class="num"><b>${reais(m.valor)}</b></td><td>${PILL_STATUS[s]}${m.pagoEm ? `<br><small class="muted">${dataLonga(m.pagoEm)} · ${esc(m.forma || "")}</small>` : ""}</td>
            <td class="num">${s === "pago" ? "" : `<button class="btn sec peq" data-pagar="${esc(m.id)}">Marcar pago</button>`}</td></tr>`;
        }).join("")}</tbody></table>` : `<div class="vazio">Nenhuma mensalidade com esse filtro.</div>`}
      </div>`;

    el.querySelector("#ant").onclick = () => { estado.comp = somarMeses(comp, -1); ctx.redesenhar(); };
    el.querySelector("#prox").onclick = () => { estado.comp = somarMeses(comp, 1); ctx.redesenhar(); };
    el.querySelector("#atual")?.addEventListener("click", () => { estado.comp = hoje.slice(0, 7); ctx.redesenhar(); });
    el.querySelector("#lancar").onclick = () => abrirLancamento(store, comp, ctx.redesenhar);
    el.querySelectorAll("[data-f]").forEach(b => b.onclick = () => { estado.filtro = b.dataset.f; ctx.redesenhar(); });
    el.querySelectorAll("[data-pagar]").forEach(b => b.onclick = () => {
      const m = d.mensalidades.find(x => x.id === b.dataset.pagar);
      if (m) abrirPagamento(store, m, alunos[m.alunoId], ctx.redesenhar);
    });
  }
};
