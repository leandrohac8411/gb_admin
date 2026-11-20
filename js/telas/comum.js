// Pedaços de tela usados em várias páginas.
import { esc, iniciais } from "../ui/util.js";
import { faixaSVG, nomeFaixa } from "../ui/faixa.js";

export const DIAS_LONGOS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export const anosTexto = n => (n == null ? "idade não informada" : `${n} anos`);
export const DIAS_CURTOS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function cabecalho(titulo, sub = "", acoes = "") {
  return `<div class="cab"><div><span class="k">GB Sobradinho</span><h1>${esc(titulo)}</h1>${sub ? `<p>${sub}</p>` : ""}</div>` +
    (acoes ? `<div class="acoes-cab">${acoes}</div>` : "") + `</div>`;
}

export function etiquetaPrograma(p) {
  const tag = x => `<span class="tag ${x.toLowerCase()}">${x}</span>`;
  if (p === "GB1+GB2") return `<span class="tags">${tag("GB1")}${tag("GB2")}</span>`;
  if (p === "Kids") return `<span class="tag kids">Kids</span>`;
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

// Abas Adultos | Kids: a escolha fica lembrada ao trocar de tela.
let categoriaAtual = "adulto";
export const aba = () => categoriaAtual;
export const definirAba = c => { categoriaAtual = c === "kids" ? "kids" : "adulto"; };
export const daAba = a => (a.categoria || "adulto") === categoriaAtual;

export function abasCategoria(d) {
  const n = c => d.alunos.filter(a => (a.categoria || "adulto") === c && a.status === "ativo").length;
  return `<div class="abas" role="tablist">${[["adulto", "Adultos"], ["kids", "Kids"]].map(([c, nome]) =>
    `<button role="tab" aria-selected="${c === categoriaAtual}" class="${c === categoriaAtual ? "on" : ""}" data-cat="${c}">${nome} <span>${n(c)}</span></button>`).join("")}</div>`;
}

export function ligarAbas(el, ctx, antes) {
  el.querySelectorAll("[data-cat]").forEach(b => b.onclick = () => {
    if (b.dataset.cat === categoriaAtual) return;
    categoriaAtual = b.dataset.cat; antes?.(); ctx.redesenhar();
  });
}

// Estrelas de 0 a 5 (aceita meia: 3,5 → ★★★½☆ em visual simplificado).
export function estrelas(n) {
  const v = Math.max(0, Math.min(5, Math.round(Number(n) || 0)));
  return `<span class="estrelas" role="img" aria-label="${String(Number(n) || 0).replace(".", ",")} de 5">${"★".repeat(v)}<i>${"★".repeat(5 - v)}</i></span>`;
}
