// Tela de login do GB Admin: mesmo bloqueio do Diário (5 erros em 10 minutos = espera de 1 minuto).
import { entrar, redefinirSenha } from "../nuvem/firebase.js";
import { toast, esc } from "../ui/util.js";
import { icone } from "../menu.js";
import { registrarFalha, registrarSucesso, esperaRestante, tentativasRestantes, normalizar } from "../logica/tentativas.js";

const CHAVE = "gb-admin:login";
const lerTentativas = () => { try { return normalizar(JSON.parse(localStorage.getItem(CHAVE))); } catch { return normalizar(null); } };
const gravarTentativas = t => { try { localStorage.setItem(CHAVE, JSON.stringify(t)); } catch { /* modo privado: fica só na memória */ } };
let tentativasMem = null;
const tentativas = () => tentativasMem || (tentativasMem = lerTentativas());
const salvarTentativas = t => { tentativasMem = t; gravarTentativas(t); };
let ultimoReset = 0;

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Ícones do login (mesmo traço do Diário de Tatame).
const ic = {
  email: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6l8.5 7 8.5-7"/></svg>',
  senha: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></svg>',
  olho: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  olhoFechado: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path d="M4 20L20 4"/></svg>',
  entrar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M3 12h11M10 8l4 4-4 4"/></svg>'
};

// aviso: mensagem inicial (ex.: "Este e-mail não tem acesso"). voltarDemo: só no computador.
export function montarLogin(el, { aviso = "", voltarDemo = null } = {}) {
  el.innerHTML = `
    <div class="lp">
      <div class="lp-poster">
      <aside class="lp-lado">
        <div class="lp-lado-marca"><img src="img/logo-sobradinho.png" alt="GB Sobradinho"><div><strong>GB Sobradinho</strong><span>Admin</span></div></div>
        <span class="lp-lado-regua" aria-hidden="true"></span>
        <h2>Gestão completa da sua <em>academia</em></h2>
        <p>Alunos, presenças, mensalidades, graduações e muito mais em um só lugar.</p>
        <ul class="lp-lado-itens">
          <li><span>${icone("alunos")}</span>Gestão<br>de alunos</li>
          <li><span>${icone("relatorios")}</span>Financeiro<br>e relatórios</li>
          <li><span>${icone("graduacoes")}</span>Graduações<br>e evolução</li>
        </ul>
      </aside>
      <div class="lp-fundo" aria-hidden="true"></div>
      <div class="lp-conteudo">
        <header class="lp-marca">
          <div class="lp-linha-marca">
            <img class="lp-logo" src="img/logo-sobradinho.png" alt="GB Sobradinho">
            <span class="lp-separador" aria-hidden="true"></span>
            <h1 class="lp-app">GB Sobradinho<span>Admin</span></h1>
          </div>
          <div class="lp-regua" aria-hidden="true"></div>
          <p class="lp-frase">Gestão da academia, do <em>tatame</em> ao caixa</p>
        </header>
        <div class="lp-desk-cab"><span class="lp-lado-regua" aria-hidden="true"></span><h2>Entrar no painel</h2><p>Acesso restrito à equipe da academia.</p></div>
        <form id="lg-f" class="lp-form" novalidate>
          <div class="lp-grupo"><label for="lg-email">E-mail</label>
            <div class="lp-campo">${ic.email}<input id="lg-email" type="email" placeholder="seu@email.com" autocomplete="username" inputmode="email" maxlength="254" autocapitalize="none" spellcheck="false" required></div></div>
          <div class="lp-grupo"><label for="lg-senha">Senha</label>
            <div class="lp-campo">${ic.senha}<input id="lg-senha" type="password" placeholder="Digite sua senha" autocomplete="current-password" maxlength="128" required>
              <button type="button" class="lp-olho" id="lg-olho" aria-label="Mostrar senha">${ic.olho}</button></div></div>
          <div class="lp-esqueci"><button type="button" id="lg-esqueci">Esqueci minha senha</button></div>
          <button class="lp-entrar" type="submit" id="lg-entrar">${ic.entrar}<span>ENTRAR</span></button>
        </form>
        <p class="lp-aviso" id="lg-erro" role="status" aria-live="polite">${esc(aviso)}</p>
        ${voltarDemo ? '<div class="lp-ou"><span>ou</span></div><button class="lp-bio" type="button" id="lg-demo">Ver a demonstração</button>' : ""}
      </div>
      </div>
    </div>`;
  const $ = id => el.querySelector("#lg-" + id);
  const erro = t => { $("erro").textContent = t; };
  const botao = (t, travado) => { $("entrar").querySelector("span").textContent = t; $("entrar").disabled = travado; };
  if (voltarDemo) $("demo").onclick = voltarDemo;
  $("olho").onclick = () => {
    const ver = $("senha").type === "password";
    $("senha").type = ver ? "text" : "password";
    $("olho").innerHTML = ver ? ic.olhoFechado : ic.olho;
    $("olho").setAttribute("aria-label", ver ? "Esconder senha" : "Mostrar senha");
  };

  let relogio = null;
  const mostrarBloqueio = () => {
    clearInterval(relogio);
    const atualizar = () => {
      if (!el.isConnected) return clearInterval(relogio);
      const falta = esperaRestante(tentativas(), Date.now());
      if (!falta) { clearInterval(relogio); botao("ENTRAR", false); erro(""); return; }
      botao(`AGUARDE ${Math.ceil(falta / 1000)}s`, true);
      erro("Muitas tentativas erradas. Por segurança, espere 1 minuto para tentar de novo.");
    };
    atualizar(); relogio = setInterval(atualizar, 1000);
  };
  if (esperaRestante(tentativas(), Date.now())) mostrarBloqueio();

  $("f").addEventListener("submit", async e => {
    e.preventDefault();
    if (esperaRestante(tentativas(), Date.now())) return mostrarBloqueio();
    const email = $("email").value.trim(), senha = $("senha").value;
    if (!email || !senha) return erro("Preencha e-mail e senha.");
    // Campos absurdos nem vão para o servidor.
    if (email.length > 254 || senha.length > 128 || !EMAIL_OK.test(email)) return erro("E-mail ou senha incorretos.");
    erro(""); botao("ENTRANDO…", true);
    try {
      await entrar(email, senha);
      salvarTentativas(registrarSucesso());
      // Quem abre o painel é o aviso de "usuário mudou" (ver telas/index.js).
    } catch (err) {
      botao("ENTRAR", false);
      const codigo = err?.code || "";
      if (codigo === "auth/network-request-failed") return erro("Sem internet. Confira a conexão e tente de novo.");
      if (codigo === "auth/too-many-requests") {
        salvarTentativas({ falhas: tentativas().falhas, ate: Date.now() + 60_000 });
        return mostrarBloqueio();
      }
      if (codigo === "auth/user-disabled") return erro("Esta conta está desativada.");
      const t = registrarFalha(tentativas(), Date.now());
      salvarTentativas(t);
      if (esperaRestante(t, Date.now())) return mostrarBloqueio();
      const resta = tentativasRestantes(t, Date.now());
      erro(resta <= 2 ? `E-mail ou senha incorretos. Mais ${resta} tentativa${resta === 1 ? "" : "s"} e o acesso fica bloqueado por 1 minuto.` : "E-mail ou senha incorretos.");
      $("senha").value = ""; $("senha").focus();
    }
  });

  $("esqueci").onclick = async () => {
    const email = $("email").value.trim();
    if (!email) return erro("Digite seu e-mail acima para receber o link.");
    if (email.length > 254 || !EMAIL_OK.test(email)) return erro("Confira o e-mail digitado.");
    // Um pedido por minuto, para ninguém usar o botão para encher a caixa de e-mail de alguém.
    if (Date.now() - ultimoReset < 60_000) return erro("Já enviamos um link. Espere 1 minuto para pedir outro.");
    ultimoReset = Date.now();
    // Mesma resposta exista ou não a conta (não revela quais e-mails estão cadastrados).
    try { await redefinirSenha(email); } catch { /* mesma mensagem */ }
    toast("Se este e-mail tiver conta, enviamos um link para redefinir a senha.");
  };
}
