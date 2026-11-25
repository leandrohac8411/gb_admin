// Ficha do aluno (painel logado): cartão "Portal do aluno" para liberar ou tirar o acesso ao /aluno.
// Só muda aluno.emailPortal e salva; o espelho (js/logica/portal-sincronia.js) grava ou apaga o acesso.
import { esc, perguntar, toast } from "../ui/util.js";
import { podeTerAcesso, emailValido } from "../logica/portal.js";

export function cartaoPortal(a) {
  if (!podeTerAcesso(a)) return "";
  const email = a.emailPortal || "";
  return `<div class="card portal-cartao"><div class="card-cab"><div><h3>Portal do aluno</h3>
      <small>${email ? `Acesso liberado para <b>${esc(email)}</b>${a.status === "ativo" ? "" : " · suspenso enquanto a matrícula estiver trancada"}` : "O aluno vê as aulas, as fotos e escreve o diário dele em admin-gbsob.vercel.app/aluno."}</small></div></div>
    ${email ? '<button class="btn sec peq" id="portal-tirar">Tirar acesso</button>'
      : `<form class="portal-liberar" novalidate><input class="input" type="email" id="portal-email" placeholder="E-mail do aluno" autocomplete="off" value="">
        <button class="btn peq">Liberar acesso</button></form><p class="aviso" id="portal-erro" hidden></p>`}</div>`;
}

export function ligarCartaoPortal(el, store, a, ctx) {
  const form = el.querySelector(".portal-liberar");
  if (form) form.onsubmit = e => {
    e.preventDefault();
    const email = emailValido(el.querySelector("#portal-email").value), erro = el.querySelector("#portal-erro");
    const mostrar = msg => { erro.textContent = msg; erro.hidden = false; };
    if (!email) return mostrar("Confira o e-mail.");
    const outro = store.dados.alunos.find(x => x !== a && x.emailPortal === email);
    if (outro) return mostrar(`Esse e-mail já está liberado para ${outro.nome}.`);
    a.emailPortal = email;
    if (store.salvar() === false) { delete a.emailPortal; return; }
    toast("Acesso liberado. Peça para o aluno abrir admin-gbsob.vercel.app/aluno e tocar em Primeiro acesso.");
    ctx.redesenhar();
  };
  el.querySelector("#portal-tirar")?.addEventListener("click", async () => {
    if (!await perguntar("Tirar acesso ao portal?", `${a.nome} deixa de entrar no /aluno. O diário dele fica guardado e volta se o acesso for liberado de novo.`, "Tirar acesso", "Cancelar")) return;
    const antes = a.emailPortal;
    delete a.emailPortal;
    if (store.salvar() === false) { a.emailPortal = antes; return; }
    toast("Acesso ao portal retirado");
    ctx.redesenhar();
  });
}
