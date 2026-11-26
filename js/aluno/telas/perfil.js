// Portal do aluno: perfil (nome, e-mail e sair).
import { esc, perguntar } from "../ui/util.js";

export default {
  menu: "perfil",
  montar(el, params, ctx) {
    el.innerHTML = `<div class="ttl">Perfil</div>
      <div class="card"><div class="k">Nome</div><b>${esc(ctx.portal?.nome || ctx.acesso?.nome || "")}</b>
        <div class="k" style="margin-top:12px">E-mail</div><b>${esc(ctx.usuario.email)}</b></div>
      <p class="muted" style="font-size:13px">Faixa, graus e presenças vêm do GB Admin. Se algo estiver errado, fale com o professor.</p>
      <button class="btn ghost bloco" id="sair">Sair</button>`;
    el.querySelector("#sair").onclick = async () => { if (await perguntar("Sair do portal?", "Para entrar de novo, use seu e-mail e senha.", "Sair", "Cancelar")) ctx.nuvem.sair(); };
  }
};
