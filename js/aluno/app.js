// Portal do aluno (/aluno): as telas do Diário de Tatame, com login de aluno liberado pelo GB Admin.
// Navegação por hash (#rota/param1/param2), igual ao Diário.
import * as nuvem from "./nuvem.js";
import { menuInferior } from "./ui/icones.js";
import { esc } from "./ui/util.js";
import { hojeISO } from "./logica/datas.js";

const $tela = document.getElementById("tela");
const $menu = document.getElementById("menu");

// Cada tela é um módulo em js/aluno/telas/<nome>.js que exporta default:
//   { menu: "inicio" | null, vivo: boolean, montar(el, params, ctx) -> (limpar?) }
const TELAS = ["inicio", "checkin", "grade", "diario", "aula", "turma", "evolucao", "perfil"];
const cache = {};
async function carregarTela(nome) {
  if (!cache[nome]) cache[nome] = (await import(`./telas/${nome}.js`)).default;
  return cache[nome];
}

// situacao: "carregando" | "login" | "verificar" | "naoLiberado" | "pronto"
export const ctx = { nuvem, situacao: "carregando", usuario: null, acesso: null, estado: null };
let limparAtual = null, telaAtual = null, rotaAtual = "";

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
  if (typeof limparAtual === "function") { limparAtual(); limparAtual = null; }
  if (ctx.situacao === "carregando" || (ctx.situacao === "pronto" && !ctx.estado?.pronto && !ctx.estado?.erro)) {
    $tela.className = "sem-menu"; $menu.hidden = true; $tela.innerHTML = '<p class="vazio">Carregando…</p>'; return;
  }
  if (ctx.situacao !== "pronto") {
    telaAtual = null;
    const entrar = (await import("./entrar.js")).default;
    $tela.className = "sem-menu login"; $menu.hidden = true; $tela.innerHTML = "";
    entrar.montar($tela, ctx);
    return;
  }
  if (ctx.estado.erro) {
    $tela.className = "sem-menu"; $menu.hidden = true;
    $tela.innerHTML = `<p class="aviso">${esc(ctx.estado.erro)}</p><button class="btn ghost" id="recarregar">Tentar de novo</button>`;
    $tela.querySelector("#recarregar").onclick = () => location.reload();
    return;
  }
  const { rota, params } = lerRota();
  const tela = await carregarTela(rota);
  const mesmaRota = location.hash === rotaAtual;
  const rolagem = mesmaRota ? window.scrollY : 0;
  rotaAtual = location.hash; telaAtual = tela;
  $tela.className = tela.classe || (tela.menu ? "" : "sem-menu");
  $tela.innerHTML = "";
  limparAtual = await tela.montar($tela, params, ctx);
  $menu.hidden = !tela.menu;
  if (tela.menu) $menu.innerHTML = menuInferior(tela.menu);
  window.scrollTo(0, rolagem);
}

// Dados novos chegaram: redesenha as telas "vivas" (formulários não, para não apagar o que se digita).
function dadosMudaram() {
  if (!telaAtual) desenhar(); else if (telaAtual.vivo && !document.querySelector(".folha")) desenhar();
}

window.addEventListener("hashchange", desenhar);
let diaDoDesenho = hojeISO();
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  const hoje = hojeISO();
  if (hoje !== diaDoDesenho) { diaDoDesenho = hoje; if (telaAtual?.vivo) desenhar(); }
});

// Entra: confere e-mail confirmado e acesso liberado pela academia; depois carrega os dados.
export async function iniciar(user) {
  if (ctx.estado?.parar) ctx.estado.parar();
  Object.assign(ctx, { usuario: null, acesso: null, estado: null });
  telaAtual = null;
  if (!user) { ctx.situacao = "login"; return desenhar(); }
  ctx.usuario = { uid: user.uid, email: (user.email || "").toLowerCase() };
  if (!user.emailVerified) { ctx.situacao = "verificar"; return desenhar(); }
  try { ctx.acesso = await nuvem.lerAcesso(ctx.usuario.email); } catch { ctx.acesso = null; }
  if (!ctx.acesso?.ativo) { ctx.situacao = "naoLiberado"; return desenhar(); }
  ctx.situacao = "pronto";
  const { iniciarEstado } = await import("./estado.js");
  ctx.estado = iniciarEstado({ ...ctx.usuario, nome: ctx.acesso.nome }, ctx.acesso, dadosMudaram);
  desenhar();
}

if (!nuvem.configurado) $tela.innerHTML = '<p class="aviso">O portal ainda não está configurado.</p>';
else nuvem.aoMudarUsuario(u => iniciar(u).catch(e => { console.error(e); ctx.situacao = "login"; desenhar(); }));
