// Pedaços de tela usados em várias páginas.
import { esc, iniciais } from "../ui/util.js";
import { faixaSVG, nomeFaixa } from "../ui/faixa.js";

export const DIAS_LONGOS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export const DIAS_CURTOS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function cabecalho(titulo, sub = "", acoes = "") {
  return `<div class="cab"><div><span class="k">GB Sobradinho</span><h1>${esc(titulo)}</h1>${sub ? `<p>${sub}</p>` : ""}</div>` +
    (acoes ? `<div class="acoes-cab">${acoes}</div>` : "") + `</div>`;
}

export function etiquetaPrograma(p) {
  const tag = x => `<span class="tag ${x.toLowerCase()}">${x}</span>`;
  if (p === "GB1+GB2") return `<span class="tags">${tag("GB1")}${tag("GB2")}</span>`;
  return p === "GB1" || p === "GB2" ? tag(p) : `<span class="tag">${esc(p || "—")}</span>`;
}

export function pessoa(aluno, sub = "") {
  return `<div class="pessoa"><span class="av">${esc(iniciais(aluno.nome))}</span><div style="min-width:0"><b>${esc(aluno.nome)}</b>` +
    `${sub ? `<small>${sub}</small>` : ""}</div></div>`;
}

export const faixaCelula = a => `<div class="faixa-cell">${faixaSVG(a.faixa, a.graus, { mini: true })}<span>${nomeFaixa(a.faixa)}${a.graus ? ` · ${a.graus}º` : ""}</span></div>`;

export const nomeProfessor = (dados, id) => dados.professores.find(p => p.id === id)?.nome || "—";

export const porId = lista => Object.fromEntries(lista.map(x => [x.id, x]));

export const PILL_STATUS = {
  pago: '<span class="pill ok">Pago</span>',
  pendente: '<span class="pill alerta">Pendente</span>',
  atrasado: '<span class="pill ruim">Atrasado</span>',
  ativo: '<span class="pill ok">Ativo</span>',
  trancado: '<span class="pill">Trancado</span>',
  inadimplente: '<span class="pill ruim">Inadimplente</span>'
};
