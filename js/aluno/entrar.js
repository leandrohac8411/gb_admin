// Portal do aluno: entrar, primeiro acesso, esqueci a senha e os avisos de e-mail não confirmado / não liberado.
import { esc, toast } from "./ui/util.js";
import { mensagemDeErroLogin } from "../logica/portal-aluno.js";
import { registrarFalha, registrarSucesso, esperaRestante, normalizar } from "../logica/tentativas.js";

const CHAVE = "gb-aluno:login";
const lerT = () => { try { return normalizar(JSON.parse(localStorage.getItem(CHAVE))); } catch { return normalizar(null); } };
const gravarT = t => { try { localStorage.setItem(CHAVE, JSON.stringify(t)); } catch { /* modo privado */ } };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
let modo = "entrar", ultimoEnvio = 0;

const marca = `<div class="lp-fundo" aria-hidden="true"></div>
  <header class="lp-marca"><div class="lp-linha-marca">
    <div class="lp-gb"><img class="lp-logo" src="../img/logo-gb.png" alt="Gracie Barra"><div class="lp-gb-texto"><strong>GRACIE BARRA</strong><span>GB SOBRADINHO</span></div></div>
    <span class="lp-separador" aria-hidden="true"></span><h1 class="lp-app">Portal do<br>Aluno</h1></div>
    <div class="lp-regua" aria-hidden="true"></div></header>`;

export default {
  montar(el, ctx) {
    const n = ctx.nuvem;
    if (ctx.situacao === "verificar" || ctx.situacao === "naoLiberado") {
      const verificar = ctx.situacao === "verificar";
      el.innerHTML = `${marca}<div class="lp-conteudo"><div class="lp-form">
        <p class="lp-frase">${verificar ? `Confirme o e-mail que enviamos para <b>${esc(ctx.usuario.email)}</b>. Depois toque em <em>Já confirmei</em>.`
          : `O e-mail <b>${esc(ctx.usuario.email)}</b> ainda não foi liberado pela academia. Fale com o professor ou a recepção.`}</p>
        ${verificar ? '<button class="lp-entrar" id="ja"><span>JÁ CONFIRMEI</span></button><button class="lp-bio" id="reenviar" type="button"><span>Reenviar o e-mail</span></button>' : ""}
        <button class="lp-bio" id="sair" type="button"><span>Sair</span></button>
        <p class="lp-aviso" id="erro" role="status" aria-live="polite"></p></div></div>`;
      el.querySelector("#sair").onclick = () => n.sair();
      el.querySelector("#ja")?.addEventListener("click", async () => {
        try {
          if (await n.conferirVerificacao()) { const { iniciar } = await import("./app.js"); iniciar(n.usuarioAtual()); }
          else el.querySelector("#erro").textContent = "Ainda não consta a confirmação. Abra o link do e-mail (veja também o spam).";
        } catch { el.querySelector("#erro").textContent = "Sem internet. Tente de novo."; }
      });
      el.querySelector("#reenviar")?.addEventListener("click", async () => {
        if (Date.now() - ultimoEnvio < 60_000) { el.querySelector("#erro").textContent = "Já enviamos. Espere 1 minuto para pedir de novo."; return; }
        ultimoEnvio = Date.now();
        try { await n.reenviarVerificacao(); toast("E-mail de confirmação reenviado."); } catch (e) { el.querySelector("#erro").textContent = mensagemDeErroLogin(e?.code); }
      });
      return;
    }

    const primeiro = modo === "primeiro", esqueci = modo === "esqueci";
    el.innerHTML = `${marca}<div class="lp-conteudo">
      <p class="lp-frase">${primeiro ? "Crie sua senha com o e-mail que a academia liberou." : esqueci ? "Enviamos um link para criar uma senha nova." : "Acesse suas aulas no <em>tatame</em>"}</p>
      <form id="f" class="lp-form" novalidate>
        <div class="lp-grupo"><label for="email">E-mail</label><div class="lp-campo"><input id="email" type="email" placeholder="seu@email.com" autocomplete="username" inputmode="email" maxlength="254" autocapitalize="none" spellcheck="false"></div></div>
        ${esqueci ? "" : `<div class="lp-grupo"><label for="senha">Senha</label><div class="lp-campo"><input id="senha" type="password" placeholder="${primeiro ? "Mínimo 6 caracteres" : "Digite sua senha"}" autocomplete="${primeiro ? "new-password" : "current-password"}" maxlength="128"></div></div>`}
        ${primeiro ? '<div class="lp-grupo"><label for="senha2">Repita a senha</label><div class="lp-campo"><input id="senha2" type="password" autocomplete="new-password" maxlength="128"></div></div>' : ""}
        ${modo === "entrar" ? '<div class="lp-esqueci"><button type="button" data-modo="esqueci">Esqueci minha senha</button></div>' : ""}
        <button class="lp-entrar" type="submit" id="ok"><span>${primeiro ? "CRIAR ACESSO" : esqueci ? "ENVIAR LINK" : "ENTRAR"}</span></button>
      </form>
      <div class="lp-ou"><span>ou</span></div>
      ${modo === "entrar" ? '<button class="lp-bio" type="button" data-modo="primeiro"><span>Primeiro acesso</span></button>' : '<button class="lp-bio" type="button" data-modo="entrar"><span>Já tenho senha</span></button>'}
      <p class="lp-aviso" id="erro" role="status" aria-live="polite"></p></div>`;
    const $ = id => el.querySelector("#" + id), erro = t => { $("erro").textContent = t; };
    el.querySelectorAll("[data-modo]").forEach(b => b.onclick = () => { modo = b.dataset.modo; this.montar(el, ctx); });
    $("f").onsubmit = async e => {
      e.preventDefault();
      const email = $("email").value.trim().toLowerCase(), senha = $("senha")?.value || "";
      if (!EMAIL.test(email) || email.length > 254) return erro("Confira o e-mail.");
      if (esqueci) {
        if (Date.now() - ultimoEnvio < 60_000) return erro("Já enviamos um link. Espere 1 minuto para pedir outro.");
        ultimoEnvio = Date.now();
        try { await n.esqueciSenha(email); } catch { /* mesma resposta: não revela quem tem conta */ }
        modo = "entrar"; this.montar(el, ctx);
        toast("Se este e-mail tiver conta, enviamos um link para criar uma senha nova.");
        return;
      }
      if (!senha) return erro("Digite a senha.");
      if (primeiro && senha.length < 6) return erro("A senha precisa ter pelo menos 6 caracteres.");
      if (primeiro && senha !== $("senha2").value) return erro("As duas senhas não estão iguais.");
      if (!primeiro && esperaRestante(lerT(), Date.now())) return erro("Muitas tentativas erradas. Espere 1 minuto e tente de novo.");
      $("ok").disabled = true; erro("");
      try {
        if (primeiro) { await n.criarConta(email, senha); toast("Conta criada. Confirme o e-mail que acabamos de enviar."); modo = "entrar"; }
        else { await n.entrar(email, senha); gravarT(registrarSucesso()); }
      } catch (err) {
        $("ok").disabled = false;
        if (!primeiro && ["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found"].includes(err?.code)) gravarT(registrarFalha(lerT(), Date.now()));
        erro(mensagemDeErroLogin(err?.code));
      }
    };
  }
};
