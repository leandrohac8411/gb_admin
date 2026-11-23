// Decide o que abrir (login, demonstração ou painel), cria o store, registra as telas e desenha.
import { registrar, desenhar, definirStore, quandoRestaurar, definirSair } from "../app.js";
import { criarStore } from "../store.js";
import { hojeISO } from "../logica/datas.js";
import { aplicarRegras } from "../logica/graduacao.js";
import { modoInicial, emailAutorizado } from "../logica/validar-nuvem.js";
import { USERS } from "../nuvem/config.js";
import { perguntar, toast, esc, haFolhaAberta } from "../ui/util.js";
import { mesclar, paraLocal } from "../logica/mesclar.js";
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

function mostrarLogin(fb, aviso = "") {
  elAdmin.hidden = true; elDemo.hidden = true; elLogin.hidden = false;
  document.title = "Entrar · GB Admin";
  montarLogin(elLogin, { aviso, voltarDemo: HOST_LOCAL ? () => location.reload() : null });
  // Entrou: recarrega para abrir o painel já com os dados da nuvem.
  fb.aoMudarUsuario(u => { if (u) location.reload(); });
}

function abrirPainel(modo, fb, usuario) {
  elLogin.hidden = true; elAdmin.hidden = false;
  const store = criarStore(hojeISO());
  store.salvar();
  aplicarRegras(store.dados.config.regras, store.dados.config.regrasKids);
  store.modo = modo;
  if (modo === "painel") {
    const u = USERS[usuario.email.toLowerCase()];
    store.dados.config.usuario = { ...(store.dados.config.usuario || {}), nome: u.nome, sexo: u.sexo };
    definirSair(async () => {
      if (await perguntar("Sair do painel?", "Os dados guardados neste aparelho serão apagados; continuam salvos na nuvem.", "Sair", "Cancelar")) fb.sairELimpar();
    });
    // Saiu em outra aba ou a sessão expirou: volta para o login.
    fb.aoMudarUsuario(u2 => { if (!u2) location.reload(); });
    ouvirNuvem(store);
  } else {
    elDemo.hidden = false;
    elDemo.innerHTML = `<span>Demonstração: dados fictícios, nada vai para a nuvem.</span>${fb?.configurado ? '<button type="button" id="demo-entrar">Entrar com a conta</button>' : ""}`;
    elDemo.querySelector("#demo-entrar")?.addEventListener("click", () => mostrarLogin(fb));
  }
  definirStore(store);

  quandoRestaurar(async () => {
    if (!await perguntar("Restaurar dados de exemplo?", "Tudo o que foi cadastrado ou alterado aqui volta para a academia de exemplo.", "Restaurar", "Cancelar")) return;
    store.restaurar(hojeISO());
    aplicarRegras(store.dados.config.regras, store.dados.config.regrasKids);
    desenhar();
    toast("Dados de exemplo restaurados");
  });

  Object.entries({ dashboard, alunos, aluno, agenda, checkins, graduacoes, financeiro, eventos,
    professores: gestao.professores, acompanhamentos: gestao.acompanhamentos, cronogramas: gestao.cronogramas,
    "modelos-aula": gestao.modelosAula, habilidades: gestao.habilidades,
    planos: operacao.planos, contratos: operacao.contratos, prospects: operacao.prospects,
    comunicacao: operacao.comunicacao, relatorios: operacao.relatorios,
    documentos: admin.documentos, mensagens: admin.mensagens, permissoes: admin.permissoes, config: admin.config }).forEach(([rota, tela]) => registrar(rota, tela));

  desenhar();
  return store;
}

// Dados reais: a cada mudança na nuvem, remescla sobre o fictício atual e redesenha.
// Se houver uma janela de edição aberta, espera ela fechar (não apaga o que a pessoa está digitando).
async function ouvirNuvem(store) {
  const { ouvirTudo } = await import("../nuvem/dados.js");
  let espera = null;
  const redesenhar = () => {
    if (!haFolhaAberta()) { clearInterval(espera); espera = null; return desenhar(); }
    espera ??= setInterval(redesenhar, 500);
  };
  ouvirTudo(reais => {
    store.dados = mesclar(paraLocal(store.dados), reais);
    redesenhar();
  }, e => { console.error(e); toast("Não consegui ler os dados da nuvem. Confira a internet."); });
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
    if (usuario && !emailAutorizado(usuario.email)) { aviso = `O e-mail ${usuario.email} não tem acesso ao painel.`; await fb.sair(); }
    return mostrarLogin(fb, aviso);
  }
  abrirPainel(modo, fb, usuario);
}

iniciar().catch(e => {
  console.error(e);
  elLogin.hidden = false;
  elLogin.innerHTML = `<div class="login-caixa"><h1>Não foi possível abrir</h1><p class="muted">${esc(e.message)}</p></div>`;
});
