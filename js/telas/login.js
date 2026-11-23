// Tela de login do GB Admin: mesmo bloqueio do Diário (5 erros em 10 minutos = espera de 1 minuto).
import { entrar, redefinirSenha } from "../nuvem/firebase.js";
import { toast, esc } from "../ui/util.js";
import { registrarFalha, registrarSucesso, esperaRestante, tentativasRestantes, normalizar } from "../logica/tentativas.js";

const CHAVE = "gb-admin:login";
const lerTentativas = () => { try { return normalizar(JSON.parse(localStorage.getItem(CHAVE))); } catch { return normalizar(null); } };
const gravarTentativas = t => { try { localStorage.setItem(CHAVE, JSON.stringify(t)); } catch { /* modo privado: fica só na memória */ } };
let tentativasMem = null;
const tentativas = () => tentativasMem || (tentativasMem = lerTentativas());
const salvarTentativas = t => { tentativasMem = t; gravarTentativas(t); };
let ultimoReset = 0;

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// aviso: mensagem inicial (ex.: "Este e-mail não tem acesso"). voltarDemo: só no computador.
export function montarLogin(el, { aviso = "", voltarDemo = null } = {}) {
  el.innerHTML = `
    <div class="login-caixa">
      <img class="login-logo" src="img/logo-sobradinho.png" alt="GB Sobradinho">
      <h1>GB Admin</h1>
      <p class="muted">Acesso restrito à equipe da academia.</p>
      <form id="lg-f" novalidate>
        <div class="field"><label for="lg-email">E-mail</label>
          <input class="input" id="lg-email" type="email" autocomplete="username" inputmode="email" maxlength="254" autocapitalize="none" spellcheck="false" required></div>
        <div class="field"><label for="lg-senha">Senha</label>
          <input class="input" id="lg-senha" type="password" autocomplete="current-password" maxlength="128" required></div>
        <button class="btn bloco" type="submit" id="lg-entrar">Entrar</button>
        <button class="login-link" type="button" id="lg-esqueci">Esqueci minha senha</button>
      </form>
      <p class="login-erro" id="lg-erro" role="status" aria-live="polite">${esc(aviso)}</p>
      ${voltarDemo ? '<button class="login-link" type="button" id="lg-demo">Voltar para a demonstração</button>' : ""}
    </div>`;
  const $ = id => el.querySelector("#lg-" + id);
  const erro = t => { $("erro").textContent = t; };
  const botao = (t, travado) => { $("entrar").textContent = t; $("entrar").disabled = travado; };
  if (voltarDemo) $("demo").onclick = voltarDemo;

  let relogio = null;
  const mostrarBloqueio = () => {
    clearInterval(relogio);
    const atualizar = () => {
      if (!el.isConnected) return clearInterval(relogio);
      const falta = esperaRestante(tentativas(), Date.now());
      if (!falta) { clearInterval(relogio); botao("Entrar", false); erro(""); return; }
      botao(`Aguarde ${Math.ceil(falta / 1000)}s`, true);
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
    erro(""); botao("Entrando…", true);
    try {
      await entrar(email, senha);
      salvarTentativas(registrarSucesso());
      // Quem abre o painel é o aviso de "usuário mudou" (ver telas/index.js).
    } catch (err) {
      botao("Entrar", false);
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
