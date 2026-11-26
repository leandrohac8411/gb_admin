// Portal do aluno: início (faixa, frequência, próximo passo e as aulas de hoje com o check-in).
import { hojeISO } from "../../logica/datas.js";
import { faixaSVG, nomeFaixa } from "../../ui/faixa.js";
import { aulasDoDia, frequenciaDoMes, esteveNaAula } from "../../logica/portal-aluno.js";
import { esc, saudacao, horaTexto } from "../ui/util.js";
import { minutosAgora, proximoPassoTexto } from "./comum.js";

const minutos = h => { const [a, b] = h.split(":").map(Number); return a * 60 + b; };

export default {
  menu: "inicio",
  montar(el, params, ctx) {
    const hoje = hojeISO(), p = ctx.portal || { presencas: [] }, agora = minutosAgora();
    const aulas = aulasDoDia(ctx.grade, hoje);
    const linhas = aulas.map(a => {
      const esteve = esteveNaAula(p, ctx.pendentes, a.turmaId, hoje);
      const ini = minutos(a.horario), fim = ini + (Number(a.duracaoMin) || 60);
      const acontecendo = agora >= ini - 30 && agora <= fim;
      let cls = "row", acao = "Ver aula", destino = `#aula/${encodeURIComponent(a.turmaId)}/${hoje}`;
      if (esteve) { cls += " feito"; acao = "Feito ✓"; }
      else if (acontecendo) { cls += " next"; acao = "Check-in"; destino = "#checkin"; }
      else if (fim < agora) cls += " past";
      const tema = a.temas.map(t => t.tema).join(" · ") || "tema da semana a definir";
      return `<a class="${cls}" href="${destino}" style="text-decoration:none;color:inherit">
        <span class="t">${horaTexto(a.horario)}</span>
        <span class="d">${esc(a.programa)}${a.professor ? ` · ${esc(a.professor)}` : ""}<small>${esc(tema)}</small></span>
        <span class="go">${acao}</span></a>`;
    }).join("");
    el.innerHTML = `
      <header class="topo-ini"><div class="hrow">
        <div class="logo" role="img" aria-label="GB Sobradinho"></div>
        <div class="who"><small>${saudacao()}</small><b>${esc((p.nome || ctx.acesso?.nome || "").split(" ")[0])}</b></div>
      </div></header>
      <div class="beltwrap">${faixaSVG(p.faixa || "branca", p.graus || 0)}<div class="lbl"><span>Faixa ${esc(nomeFaixa(p.faixa || "branca").toLowerCase())}</span><span>${p.graus || 0} de 4 graus</span></div></div>
      <div class="prog"><div class="stats">
        <div><b>${frequenciaDoMes(p.presencas, hoje.slice(0, 7))}</b><small>Aulas no mês</small></div>
        <div><b>${p.presencas?.length || 0}</b><small>No total</small></div>
        <div><b>${p.proximoPasso?.aulas ?? 0}</b><small>Desde o último grau</small></div>
      </div>${proximoPassoTexto(p.proximoPasso, p.faixa) ? `<p class="passo">${esc(proximoPassoTexto(p.proximoPasso, p.faixa))}</p>` : ""}</div>
      <section class="card-grade"><div class="cg-cab"><div class="cg-tit"><b>Aulas de hoje</b><small>toque para ver a aula ou fazer o check-in</small></div></div>
        ${linhas ? `<div class="cls">${linhas}</div>` : '<div class="cg-vazio"><p><b>Sem aula hoje.</b>Bom descanso!</p></div>'}</section>`;
  }
};
