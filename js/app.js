// GB Admin: roteador por hash (#rota/param) e moldura com menu lateral.
import { desenharMenu, itemDoMenu, alternarGrupo, icone } from "./menu.js";
import { resumoDashboard } from "./logica/indicadores.js";
import { hojeISO } from "./logica/datas.js";
import { esc, fecharFolhas, limitarCampos } from "./ui/util.js";
import embreve from "./telas/embreve.js";
import { lerRota } from "./rota.js";

const TELAS = {};
const ctx = { store: null, ir: rota => { location.hash = "#" + rota; }, redesenhar: () => desenhar() };

const lateral = document.getElementById("lateral");
const fundoMenu = document.getElementById("fundo-menu");
const tela = document.getElementById("tela");
const heroTitulo = document.getElementById("hero-titulo"), heroSub = document.getElementById("hero-sub"), ola = document.getElementById("ola");
const sino = document.getElementById("sino"), avisos = document.getElementById("avisos");
const LEMA = "GB Sobradinho – Gestão completa da sua academia";

function abrirMenu(abrir) {
  document.body.classList.toggle("menu-aberto", abrir);
  fundoMenu.hidden = !abrir;
}
document.getElementById("abrir-menu").onclick = () => abrirMenu(true);
fundoMenu.onclick = () => abrirMenu(false);

// Busca do topo: leva para Alunos já filtrado.
document.getElementById("busca-topo").onsubmit = e => {
  e.preventDefault();
  const q = document.getElementById("busca-topo-q").value.trim();
  ctx.ir(q ? `alunos/busca/${encodeURIComponent(q)}` : "alunos");
};

// Sino: pendências do dia, as mesmas do Dashboard.
function pendencias() {
  if (!ctx.store) return [];
  const r = resumoDashboard(ctx.store.dados, hojeISO()), l = [];
  if (r.aptos) l.push(["graduacoes", "graduacoes", `${r.aptos} aptos a graduar`]);
  if (r.viramAdultos) l.push(["graduacoes", "alunos", `${r.viramAdultos} criança(s) fez 16 anos`]);
  if (r.inadimplentes) l.push(["financeiro", "financeiro", `${r.inadimplentes} mensalidade(s) atrasada(s)`]);
  const hoje = hojeISO().slice(5);
  const niver = r.aniversariantes.filter(a => a.nascimento.slice(5) === hoje).length;
  if (niver) l.push(["dashboard", "presente", `${niver} aniversariante(s) hoje 🎉`]);
  return l;
}
function fecharAvisos() { avisos.hidden = true; sino.setAttribute("aria-expanded", "false"); }
sino.onclick = e => {
  e.stopPropagation();
  if (!avisos.hidden) return fecharAvisos();
  const l = pendencias();
  avisos.innerHTML = `<b>Avisos</b>` + (l.length ? l.map(([rota, ic, t]) => `<a href="#${rota}">${icone(ic)}<span>${t}</span></a>`).join("") : `<p>Tudo em dia!</p>`);
  avisos.hidden = false; sino.setAttribute("aria-expanded", "true");
};
document.addEventListener("click", e => { if (!avisos.hidden && !avisos.contains(e.target)) fecharAvisos(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") fecharAvisos(); });

// O título da tela sobe para o cabeçalho com o kimono; na página fica só a barra de ações.
function subirTitulo(titulo) {
  const cab = tela.querySelector(".cab");
  const bloco = cab?.firstElementChild?.querySelector("h1") ? cab.firstElementChild : null;
  heroTitulo.textContent = bloco?.querySelector("h1").textContent || titulo;
  const sub = bloco?.querySelector("p");
  heroSub.innerHTML = sub ? sub.innerHTML : LEMA;
  if (bloco) { bloco.remove(); if (!cab.children.length) cab.remove(); }
}

export function registrar(rota, modulo) { TELAS[rota] = modulo; }
export function definirStore(store) { ctx.store = store; }
export const lerStore = () => ctx.store;

const naoEncontrada = {
  titulo: "Não encontrado",
  montar(el) {
    el.innerHTML = `<div class="vazio grande"><h2>Página não encontrada</h2><p>Esse endereço não existe no painel.</p><a class="btn" href="#dashboard">Ir para o Dashboard</a></div>`;
  }
};

export function desenhar() {
  const { rota, params } = lerRota(location.hash);
  const doMenu = itemDoMenu(rota);
  const tela_ = (Object.hasOwn(TELAS, rota) && TELAS[rota]) || (doMenu ? embreve : naoEncontrada);
  const ativa = rota === "aluno" ? "alunos" : rota;
  const u = ctx.store?.dados.config?.usuario || {};
  lateral.innerHTML = desenharMenu(ativa, u, { sair: !!aoSair, restaurar: rotuloRestaurar });
  lateral.querySelectorAll("[data-grupo]").forEach(b => b.onclick = () => {
    alternarGrupo(b.dataset.grupo);
    const g = b.parentElement, aberto = g.classList.toggle("aberto");
    b.setAttribute("aria-expanded", String(aberto));
  });
  ola.innerHTML = `${u.sexo === "F" ? "Bem-vinda" : "Bem-vindo"}, <b>${esc((u.nome || "").trim() || "visitante")}</b>`;
  fecharAvisos();
  document.getElementById("sino-ponto").hidden = !pendencias().length;
  lateral.querySelector("#restaurar").onclick = () => aoRestaurar?.();
  lateral.querySelector("#sair")?.addEventListener("click", () => aoSair?.());
  lateral.querySelectorAll("a").forEach(a => a.addEventListener("click", () => abrirMenu(false)));
  fecharFolhas();
  tela.innerHTML = "";
  try {
    tela_.montar(tela, params, ctx, doMenu);
    limitarCampos(tela);
  } catch (e) {
    console.error(e);
    tela.innerHTML = `<div class="vazio grande"><h2>Algo deu errado</h2><p>${esc(e.message)}</p></div>`;
  }
  subirTitulo(tela_.titulo || doMenu?.nome || "GB Admin");
  document.title = `${tela_.titulo || doMenu?.nome || "GB Admin"} · GB Admin`;
  tela.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

let aoRestaurar = null, aoSair = null, rotuloRestaurar = "Restaurar dados de exemplo";
export function quandoRestaurar(fn, rotulo = "Restaurar dados de exemplo") { aoRestaurar = fn; rotuloRestaurar = rotulo; }
export function definirSair(fn) { aoSair = fn; }

window.addEventListener("hashchange", desenhar);
// As telas se registram em js/telas/index.js, que chama desenhar() no fim.
import("./telas/index.js").catch(e => {
  console.error(e);
  tela.innerHTML = `<div class="card vazio grande"><h2>Não foi possível carregar o painel</h2>
    <p>Provavelmente o navegador guardou uma versão antiga dos arquivos. Recarregue com <b>Ctrl+Shift+R</b>.</p>
    <p class="muted" style="font-size:12px">${esc(e.message)}</p></div>`;
});
