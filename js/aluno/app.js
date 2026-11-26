// Portal do aluno (/aluno): login, estado e navegação por hash (#rota/param1/param2).
// Desenho: docs/superpowers/specs/2026-11-25-portal-aluno-design.md.
import * as nuvem from "./nuvem.js";
import { esc } from "./ui/util.js";
import { hojeISO } from "../logica/datas.js";

const $tela = document.getElementById("tela");
const $menu = document.getElementById("menu");

// Cada tela é um módulo em js/aluno/telas/<nome>.js que exporta default:
//   { menu: "inicio" | "aulas" | "perfil" | null, vivo?: false (não redesenha sozinha), montar(el, params, ctx) }
const TELAS = ["inicio", "aulas", "aula", "checkin", "perfil"];
const cache = {};
const carregar = async nome => (cache[nome] ||= (await import(`./telas/${nome}.js`)).default);

const MENU = [["inicio", "Início", '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>'],
  ["aulas", "Aulas", '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M7.5 14h3M13.5 14h3M7.5 17.5h3"/>'],
  ["perfil", "Perfil", '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>']];
const menuInferior = ativo => '<nav class="nav" aria-label="Menu">' + MENU.map(([r, nome, ic]) =>
  `<a href="#${r}" class="${r === ativo ? "on" : ""}"${r === ativo ? ' aria-current="page"' : ""}><svg viewBox="0 0 24 24" aria-hidden="true">${ic}</svg>${nome}</a>`).join("") + "</nav>";

// situacao: "carregando" | "login" | "verificar" | "naoLiberado" | "pronto"
export const ctx = { nuvem, situacao: "carregando", usuario: null, acesso: null, portal: null, grade: null, diario: [], pendentes: [], erro: "" };
let parar = [], telaAtual = null;

export function irPara(rota, ...params) {
  const hash = "#" + [rota, ...params.map(p => encodeURIComponent(p))].join("/");
  if (location.hash === hash) desenhar(); else location.hash = hash;
}

function lerRota() {
  const dec = p => { try { return decodeURIComponent(p); } catch { return ""; } };
  const [rota, ...params] = location.hash.replace(/^#/, "").split("/").map(dec);
  return { rota: TELAS.includes(rota) ? rota : "inicio", params };
}

export async function desenhar() {
  $menu.hidden = true;
  if (ctx.situacao === "carregando") { $tela.className = "sem-menu"; $tela.innerHTML = '<p class="vazio">Carregando…</p>'; return; }
  if (ctx.situacao !== "pronto") {
    const entrar = (await import("./entrar.js")).default;
    $tela.className = "sem-menu login"; $tela.innerHTML = "";
    entrar.montar($tela, ctx);
    return;
  }
  if (ctx.erro) { $tela.className = "sem-menu"; $tela.innerHTML = `<p class="aviso">${esc(ctx.erro)}</p>`; return; }
  const { rota, params } = lerRota();
  const tela = await carregar(rota);
  telaAtual = tela;
  const rolagem = $tela.dataset.rota === location.hash ? window.scrollY : 0;
  $tela.dataset.rota = location.hash;
  $tela.className = tela.classe || (tela.menu ? "" : "sem-menu");
  $tela.innerHTML = "";
  await tela.montar($tela, params, ctx);
  if (tela.menu) { $menu.hidden = false; $menu.innerHTML = menuInferior(tela.menu); }
  window.scrollTo(0, rolagem);
}
// Dados novos chegaram: redesenha, menos telas com formulário (vivo: false) e folhas abertas.
export const redesenhar = () => { if (ctx.situacao === "pronto" && telaAtual?.vivo !== false && !document.querySelector(".folha")) desenhar(); };

window.addEventListener("hashchange", desenhar);
let diaDoDesenho = hojeISO();
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && hojeISO() !== diaDoDesenho) { diaDoDesenho = hojeISO(); redesenhar(); }
});

// Entra: confere e-mail confirmado e acesso liberado; depois ouve o espelho, a grade, o diário e os check-ins.
export async function iniciar(user) {
  parar.forEach(f => f()); parar = [];
  Object.assign(ctx, { usuario: null, acesso: null, portal: null, grade: null, diario: [], pendentes: [], erro: "" });
  if (!user) { ctx.situacao = "login"; return desenhar(); }
  ctx.usuario = { uid: user.uid, email: (user.email || "").toLowerCase() };
  if (!user.emailVerified) { ctx.situacao = "verificar"; return desenhar(); }
  try { ctx.acesso = await nuvem.lerAcesso(ctx.usuario.email); } catch { ctx.acesso = null; }
  if (!ctx.acesso?.ativo) { ctx.situacao = "naoLiberado"; return desenhar(); }
  ctx.situacao = "carregando"; desenhar();
  const id = ctx.acesso.alunoId, chegou = new Set();
  const pronto = nome => { chegou.add(nome); if (chegou.has("portal") && chegou.has("grade")) { if (ctx.situacao !== "pronto") { ctx.situacao = "pronto"; desenhar(); } else redesenhar(); } };
  const falha = e => { console.error(e); ctx.erro = "Não consegui abrir seus dados. Confira a internet e recarregue a página."; ctx.situacao = "pronto"; desenhar(); };
  parar = [
    nuvem.ouvirPortal(id, p => { ctx.portal = p; pronto("portal"); }, falha),
    nuvem.ouvirGrade(g => { ctx.grade = g; pronto("grade"); }, falha),
    nuvem.ouvirDiario(id, l => { ctx.diario = l; redesenhar(); }, e => console.error(e)),
    nuvem.meusCheckins(id, l => { ctx.pendentes = l; redesenhar(); }, e => console.error(e))
  ];
}

if (!nuvem.configurado) $tela.innerHTML = '<p class="aviso">O portal ainda não está configurado.</p>';
else nuvem.aoMudarUsuario(u => iniciar(u).catch(e => { console.error(e); ctx.situacao = "login"; desenhar(); }));
