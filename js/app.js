// GB Admin: roteador por hash (#rota/param) e moldura com menu lateral.
import { desenharMenu, itemDoMenu } from "./menu.js";
import { esc } from "./ui/util.js";
import embreve from "./telas/embreve.js";

const TELAS = {};
const ctx = { store: null, ir: rota => { location.hash = "#" + rota; } };

const lateral = document.getElementById("lateral");
const fundoMenu = document.getElementById("fundo-menu");
const tela = document.getElementById("tela");

function abrirMenu(abrir) {
  document.body.classList.toggle("menu-aberto", abrir);
  fundoMenu.hidden = !abrir;
}
document.getElementById("abrir-menu").onclick = () => abrirMenu(true);
fundoMenu.onclick = () => abrirMenu(false);

export function registrar(rota, modulo) { TELAS[rota] = modulo; }
export function definirStore(store) { ctx.store = store; }

const naoEncontrada = {
  titulo: "Não encontrado",
  montar(el) {
    el.innerHTML = `<div class="vazio grande"><h2>Página não encontrada</h2><p>Esse endereço não existe no painel.</p><a class="btn" href="#dashboard">Ir para o Dashboard</a></div>`;
  }
};

export function desenhar() {
  const [rota = "dashboard", ...params] = (location.hash.slice(1) || "dashboard").split("/").map(decodeURIComponent);
  const doMenu = itemDoMenu(rota);
  const tela_ = TELAS[rota] || (doMenu ? embreve : naoEncontrada);
  const ativa = rota === "aluno" ? "alunos" : rota;
  lateral.innerHTML = desenharMenu(ativa);
  lateral.querySelector("#restaurar").onclick = () => aoRestaurar?.();
  lateral.querySelectorAll("a").forEach(a => a.addEventListener("click", () => abrirMenu(false)));
  tela.innerHTML = "";
  try {
    tela_.montar(tela, params, ctx, doMenu);
  } catch (e) {
    console.error(e);
    tela.innerHTML = `<div class="vazio grande"><h2>Algo deu errado</h2><p>${esc(e.message)}</p></div>`;
  }
  document.title = `${tela_.titulo || doMenu?.nome || "GB Admin"} · GB Admin`;
  tela.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

let aoRestaurar = null;
export function quandoRestaurar(fn) { aoRestaurar = fn; }

window.addEventListener("hashchange", desenhar);
// As telas se registram em js/telas/index.js, que chama desenhar() no fim.
import("./telas/index.js").catch(e => { console.error(e); desenhar(); });
