// Graduações: quem está apto (aulas + tempo), distribuição por faixa, graduar e histórico.
import { esc, perguntar, toast, dataLonga } from "../ui/util.js";
import { faixaSVG, nomeFaixa, FAIXAS, CORES_FAIXA } from "../ui/faixa.js";
import { hojeISO } from "../logica/datas.js";
import { aptidao, REGRAS, mesesEntre } from "../logica/graduacao.js";
import { cabecalho, pessoa, faixaCelula, porId } from "./comum.js";

const estado = { aba: "Aptos" };

function situacao(a, apt, hoje) {
  if (a.faixa === "preta") return '<span class="pill">Faixa preta</span>';
  if (apt.tipo === "faixa") return `<span class="pill ok">Apto à ${nomeFaixa(apt.proximaFaixa).toLowerCase()}</span>`;
  if (apt.tipo === "grau") return `<span class="pill ok">Apto ao ${a.graus + 1}º grau</span>`;
  if (apt.faltamAulas) return `<span class="pill">Faltam ${apt.faltamAulas} aulas</span>`;
  return `<span class="pill alerta">Aguardando tempo${a.graus === 4 ? ` (${mesesEntre(a.desdeFaixa, hoje)}/${REGRAS.mesesMinFaixa[a.faixa]} meses)` : ""}</span>`;
}

export default {
  titulo: "Graduações",
  montar(el, params, ctx) {
    const { store } = ctx, d = store.dados, hoje = hojeISO();
    const ativos = d.alunos.filter(a => a.status === "ativo");
    const lista = ativos.map(a => ({ a, apt: aptidao(a, d.checkins, hoje) }));
    const aptos = lista.filter(x => x.apt.tipo).sort((x, y) => (x.apt.tipo === "faixa" ? -1 : 0) - (y.apt.tipo === "faixa" ? -1 : 0) || y.apt.aulas - x.apt.aulas);
    const porFaixa = FAIXAS.map(f => [f, ativos.filter(a => a.faixa === f).length]);
    const maxF = Math.max(1, ...porFaixa.map(([, n]) => n));
    const alunos = porId(d.alunos);

    const conteudo = estado.aba === "Aptos"
      ? (aptos.length ? `<div class="grade3">${aptos.map(({ a, apt }) => {
          const nova = apt.tipo === "faixa" ? { faixa: apt.proximaFaixa, graus: 0 } : { faixa: a.faixa, graus: a.graus + 1 };
          return `<div class="card" style="display:flex;flex-direction:column;gap:12px">
            <a href="#aluno/${encodeURIComponent(a.id)}">${pessoa(a, `${apt.aulas} aulas desde ${dataLonga(a.ultimaGraduacao)}`)}</a>
            <div class="promo">${faixaSVG(a.faixa, a.graus)}<span class="seta">→</span>${faixaSVG(nova.faixa, nova.graus)}</div>
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">${situacao(a, apt, hoje)}
              <button class="btn peq" data-graduar="${esc(a.id)}">${apt.tipo === "faixa" ? "Trocar faixa" : "Dar grau"}</button></div></div>`;
        }).join("")}</div>` : `<div class="card vazio">Ninguém apto agora. Regra: ${REGRAS.aulasPorGrau} aulas e ${REGRAS.mesesPorGrau} meses por grau.</div>`)
      : estado.aba === "Todos"
      ? `<div class="card"><table class="tabela resp"><thead><tr><th>Aluno</th><th>Faixa</th><th>Aulas p/ próximo grau</th><th>Situação</th></tr></thead><tbody>${lista
          .sort((x, y) => FAIXAS.indexOf(y.a.faixa) - FAIXAS.indexOf(x.a.faixa) || y.a.graus - x.a.graus || x.a.nome.localeCompare(y.a.nome, "pt-BR"))
          .map(({ a, apt }) => `<tr class="clica" data-id="${esc(a.id)}"><td class="cheia">${pessoa(a)}</td><td>${faixaCelula(a)}</td>
            <td style="min-width:140px">${a.faixa === "preta" ? "—" : `<div class="progresso ${apt.faltamAulas ? "" : "ok"}"><i style="width:${Math.min(100, Math.round(apt.aulas / REGRAS.aulasPorGrau * 100))}%"></i></div><small class="muted">${Math.min(apt.aulas, REGRAS.aulasPorGrau)}/${REGRAS.aulasPorGrau}</small>`}</td>
            <td>${situacao(a, apt, hoje)}</td></tr>`).join("")}</tbody></table></div>`
      : `<div class="card">${d.graduacoes.length ? `<div class="lista">${[...d.graduacoes].sort((x, y) => y.data.localeCompare(x.data)).slice(0, 40).map(g => {
          const a = alunos[g.alunoId];
          return `<div>${faixaSVG(g.faixa, g.graus, { mini: true })}<div class="cresce"><b>${esc(a?.nome || "Aluno removido")}</b><small>${nomeFaixa(g.faixa)}${g.graus ? ` · ${g.graus}º grau` : ""}</small></div><span class="muted">${dataLonga(g.data)}</span></div>`;
        }).join("")}</div>` : `<div class="vazio">Nenhuma graduação registrada.</div>`}</div>`;

    el.innerHTML = cabecalho("Graduações", `Regra da vitrine: ${REGRAS.aulasPorGrau} aulas e ${REGRAS.mesesPorGrau} meses por grau; troca de faixa com 4 graus e tempo mínimo na faixa.`) +
      `<div class="grade2">
        <div class="card"><div class="card-cab"><h3>Alunos ativos por faixa</h3><small>${ativos.length} ativos</small></div>
          <div class="dist">${porFaixa.map(([f, n]) => `<div class="linha"><span>${nomeFaixa(f)}</span><div class="trilho"><i style="width:${Math.round(n / maxF * 100)}%;background:${CORES_FAIXA[f]}"></i></div><span>${n}</span></div>`).join("")}</div></div>
        <div class="kpis" style="grid-template-columns:1fr 1fr">
          <div class="kpi destaque"><div class="kpi-top"><span>Aptos agora</span></div><b>${aptos.length}</b><small>${aptos.filter(x => x.apt.tipo === "faixa").length} para troca de faixa</small></div>
          <div class="kpi"><div class="kpi-top"><span>Graduações no ano</span></div><b>${d.graduacoes.filter(g => g.data.startsWith(hoje.slice(0, 4))).length}</b><small>graus e faixas em ${hoje.slice(0, 4)}</small></div>
        </div>
      </div>
      <div class="chips" id="abas">${["Aptos", "Todos", "Histórico"].map(t => `<button class="chip${estado.aba === t ? " on" : ""}" data-aba="${t}">${t}${t === "Aptos" ? ` · ${aptos.length}` : ""}</button>`).join("")}</div>
      ${conteudo}`;

    el.querySelectorAll("[data-aba]").forEach(b => b.onclick = () => { estado.aba = b.dataset.aba; ctx.redesenhar(); });
    el.querySelectorAll("tr[data-id]").forEach(tr => tr.onclick = () => ctx.ir(`aluno/${encodeURIComponent(tr.dataset.id)}`));
    el.querySelectorAll("[data-graduar]").forEach(b => b.onclick = async () => {
      const a = d.alunos.find(x => x.id === b.dataset.graduar), apt = aptidao(a, d.checkins, hoje);
      if (!apt.tipo) return;
      const texto = apt.tipo === "faixa" ? `${a.nome} passa para a faixa ${nomeFaixa(apt.proximaFaixa).toLowerCase()}.` : `${a.nome} recebe o ${a.graus + 1}º grau na faixa ${a.faixa}.`;
      if (!await perguntar("Confirmar graduação?", texto, "Graduar", "Cancelar")) return;
      if (apt.tipo === "faixa") Object.assign(a, { faixa: apt.proximaFaixa, graus: 0, desdeFaixa: hoje });
      else a.graus += 1;
      a.ultimaGraduacao = hoje;
      d.graduacoes.push({ alunoId: a.id, data: hoje, faixa: a.faixa, graus: a.graus });
      store.salvar(); toast(`Parabéns, ${a.nome.split(" ")[0]}! 🥋`); ctx.redesenhar();
    });
  }
};
