// Decide o que abrir (login, demonstração ou painel), cria o store, registra as telas e desenha.
import { registrar, desenhar, definirStore, quandoRestaurar, definirSair } from "../app.js";
import { criarStore } from "../store.js";
import { hojeISO } from "../logica/datas.js";
import { aplicarRegras } from "../logica/graduacao.js";
import { modoInicial, adminAutorizado } from "../logica/validar-nuvem.js";
import { USERS } from "../nuvem/config.js";
import { perguntar, toast, esc, haFolhaAberta } from "../ui/util.js";
import { criarSincronia } from "../logica/sincronia.js";
import { ligarStoreAoBanco } from "../logica/painel-store.js";
import { semExemplos, temExemplos } from "../logica/baldes.js";
import { salvarComAviso } from "../logica/mesclar.js";
import { vigiarInatividade } from "../logica/inatividade.js";
import { criarSincroniaPortal } from "../logica/portal-sincronia.js";
import { montarLogin } from "./login.js";
import dashboard from "./dashboard.js";
import alunos from "./alunos.js";
import aluno from "./aluno.js";
import agenda from "./agenda.js";
import checkins from "./checkins.js";
import graduacoes from "./graduacoes.js";
import financeiro from "./financeiro.js";
import * as gestao from "./gestao.js";
import * as operacao from "./operacao.js";
import * as admin from "./admin.js";
import eventos from "./eventos.js";

const elLogin = document.getElementById("login");
const elAdmin = document.getElementById("admin");
const elDemo = document.getElementById("faixa-demo");
const HOST_LOCAL = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);

// Primeiro estado do login (o Firebase demora um instante para lembrar quem estava logado).
const primeiroUsuario = fb => new Promise(ok => { const parar = fb.aoMudarUsuario(u => { parar(); ok(u); }); });

const CHAVE_INATIVO = "gb-admin:saiu-inativo";

function mostrarLogin(fb, aviso = "") {
  elAdmin.hidden = true; elDemo.hidden = true; elLogin.hidden = false;
  document.title = "Entrar · GB Admin";
  montarLogin(elLogin, { aviso });
  // Entrou: recarrega para abrir o painel já com os dados da nuvem.
  fb.aoMudarUsuario(u => { if (u) location.reload(); });
}

// Painel logado (etapa 2): tudo vem do banco e tudo volta para ele. Nada fica no localStorage;
// quem guarda a cópia offline é o próprio Firestore.
async function abrirPainelLogado(fb, usuario) {
  // 15 minutos sem uso: a sessão cai (ninguém mexe num painel esquecido aberto).
  const vigia = vigiarInatividade({ aoExpirar: () => {
    try { sessionStorage.setItem(CHAVE_INATIVO, "1"); } catch { /* segue */ }
    fb.sairELimpar();
  } });
  if (vigia.verificar()) return;
  for (const ev of ["pointerdown", "keydown", "touchstart", "wheel"]) addEventListener(ev, vigia.marcar, { capture: true, passive: true });
  setInterval(vigia.verificar, 30_000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) vigia.verificar(); });
  elLogin.hidden = false; elAdmin.hidden = true;
  elLogin.innerHTML = `<div class="login-caixa"><h1>Carregando…</h1><p class="muted">Buscando os dados da academia no banco.</p></div>`;
  const u = USERS[usuario.email.toLowerCase()];
  const store = criarStore(hojeISO(), null);
  store.modo = "painel";
  const [{ ouvirPainel, gravarEscritas, semearSeVazio }, { gerarDados }] = await Promise.all([import("../nuvem/painel.js"), import("../dados-ficticios.js")]);
  try { await semearSeVazio(() => gerarDados(hojeISO())); }
  catch (e) { return falhaBanco(e); }
  const ctl = ligarStoreAoBanco(store, {
    usuario: { nome: u.nome, sexo: u.sexo }, avisar: toast,
    gravar: (escritas, existentes) => salvarComAviso(gravarEscritas(escritas, existentes), null)
  });
  // Redesenho vindo do banco (outra pessoa mudou algo): mantém a rolagem onde estava.
  const redesenhar = () => { const y = window.scrollY; desenhar(); window.scrollTo(0, y); };
  const sincronia = criarSincronia(store, { haFolhaAberta, desenhar: () => store.pronto && redesenhar(), mudou: ctl.mudou,
    // A configuração pode mudar em outro aparelho: as regras de graduação acompanham.
    aplicar: leitura => { ctl.aplicar(leitura); aplicarRegras(store.dados.config.regras, store.dados.config.regrasKids); } });
  let primeira;
  const pronta = new Promise(ok => { primeira = ok; });
  // Leitura sem o painel/meta é do cache ainda vazio: espera a do servidor.
  ouvirPainel(leitura => { if (!leitura.docs.meta) return; sincronia.receber(leitura); if (store.base) primeira(); }, falhaBanco);
  await pronta;
  store.pronto = true;
  // Portal do aluno: depois de cada salvar, o espelho acompanha; ao abrir, os check-ins feitos pelos
  // alunos no celular entram na lista de presença. Uma falha aqui nunca derruba o painel.
  try {
    const portal = criarSincroniaPortal({ store, nuvem: await import("../nuvem/portal.js"), hoje: hojeISO() });
    const salvarPainel = store.salvar;
    store.salvar = () => { const ok = salvarPainel(); if (ok !== false) portal.aposSalvar().catch(e => console.error(e)); return ok; };
    store.portal = portal;
    portal.aoAbrir().then(() => { if (store.pronto) desenhar(); }).catch(e => console.error(e));
  } catch (e) { console.error(e); }
  elLogin.hidden = true; elAdmin.hidden = false;
  definirSair(async () => {
    if (await perguntar("Sair do painel?", "Você volta para a tela de login. Nada é apagado: os dados continuam salvos e aparecem de novo quando você entrar.", "Sair", "Cancelar")) fb.sairELimpar();
  });
  // Saiu em outra aba ou a sessão expirou: volta para o login.
  fb.aoMudarUsuario(u2 => { if (!u2) location.reload(); });
  definirStore(store);
  quandoRestaurar(async () => {
    if (!temExemplos(store.dados)) { toast("Não há mais dados de exemplo."); return; }
    if (!await perguntar("Apagar dados de exemplo?", "Saem os alunos de exemplo e tudo ligado a eles (presenças, mensalidades, graduações...), além de prospects, despesas, eventos e recados de exemplo. Planos, modelos, grade e professores ficam. Os dados reais não são tocados.", "Apagar", "Cancelar")) return;
    store.dados = semExemplos(store.dados);
    store.salvar();
    desenhar();
    toast("Dados de exemplo apagados");
  }, "Apagar dados de exemplo", () => temExemplos(store.dados));
  registrarTelas();
  desenhar();
  return store;
}

function falhaBanco(e) {
  console.error(e);
  const semPermissao = e?.code === "permission-denied";
  elAdmin.hidden = true; elLogin.hidden = false;
  elLogin.innerHTML = `<div class="login-caixa"><h1>Não consegui abrir os dados</h1><p class="muted">${semPermissao
    ? "O banco recusou o acesso. As regras do Firebase precisam ser publicadas (firebase deploy --only firestore:rules)."
    : "Confira a internet e recarregue a página."}</p></div>`;
}

// Demonstração (Firebase não configurado): dados fictícios só neste navegador.
function abrirDemo(fb) {
  elLogin.hidden = true; elAdmin.hidden = false;
  const store = criarStore(hojeISO());
  store.salvar();
  aplicarRegras(store.dados.config.regras, store.dados.config.regrasKids);
  store.modo = "demo";
  elDemo.hidden = false;
  elDemo.innerHTML = `<span>Demonstração: dados fictícios, nada vai para a nuvem.</span>${fb?.configurado ? '<button type="button" id="demo-entrar">Entrar com a conta</button>' : ""}`;
  elDemo.querySelector("#demo-entrar")?.addEventListener("click", () => mostrarLogin(fb));
  definirStore(store);
  quandoRestaurar(async () => {
    if (!await perguntar("Restaurar dados de exemplo?", "Tudo o que foi cadastrado ou alterado aqui volta para a academia de exemplo.", "Restaurar", "Cancelar")) return;
    store.restaurar(hojeISO());
    aplicarRegras(store.dados.config.regras, store.dados.config.regrasKids);
    desenhar();
    toast("Dados de exemplo restaurados");
  });
  registrarTelas();
  desenhar();
  return store;
}

function registrarTelas() {
  Object.entries({ dashboard, alunos, aluno, agenda, checkins, graduacoes, financeiro, eventos,
    professores: gestao.professores, acompanhamentos: gestao.acompanhamentos, cronogramas: gestao.cronogramas,
    "modelos-aula": gestao.modelosAula, habilidades: gestao.habilidades,
    planos: operacao.planos, contratos: operacao.contratos, prospects: operacao.prospects,
    comunicacao: operacao.comunicacao, relatorios: operacao.relatorios,
    documentos: admin.documentos, mensagens: admin.mensagens, permissoes: admin.permissoes, config: admin.config }).forEach(([rota, tela]) => registrar(rota, tela));
}

async function iniciar() {
  let fb = null;
  try { fb = await import("../nuvem/firebase.js"); } catch (e) { console.error(e); }
  if (!fb && !HOST_LOCAL) {
    // Site publicado sem conseguir carregar o Firebase: nunca abre nada sem login.
    elLogin.hidden = false;
    elLogin.innerHTML = `<div class="login-caixa"><h1>Sem conexão</h1><p class="muted">Não consegui falar com o servidor. Confira a internet e recarregue a página.</p></div>`;
    return;
  }
  const configurado = !!fb?.configurado;
  const usuario = configurado ? await primeiroUsuario(fb) : null;
  const modo = modoInicial({ configurado, host: location.hostname, usuario });
  if (modo === "login") {
    let aviso = "";
    try { if (sessionStorage.getItem(CHAVE_INATIVO)) { aviso = "Sua sessão foi encerrada depois de 15 minutos sem uso. Entre de novo."; sessionStorage.removeItem(CHAVE_INATIVO); } } catch { /* segue */ }
    if (usuario && !adminAutorizado(usuario)) { aviso = `O e-mail ${usuario.email} não tem acesso ao painel.`; await fb.sair(); }
    return mostrarLogin(fb, aviso);
  }
  if (modo === "painel") return abrirPainelLogado(fb, usuario);
  abrirDemo(fb);
}

iniciar().catch(e => {
  console.error(e);
  elLogin.hidden = false;
  elLogin.innerHTML = `<div class="login-caixa"><h1>Não foi possível abrir</h1><p class="muted">${esc(e.message)}</p></div>`;
});
