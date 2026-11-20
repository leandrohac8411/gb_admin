// Telas do menu que ficam para a próxima leva.
import { esc } from "../ui/util.js";
import { icone } from "../menu.js";

export default {
  montar(el, params, ctx, item) {
    el.innerHTML = `<div class="cab"><div><span class="k">GB Sobradinho</span><h1>${esc(item?.nome || "Em breve")}</h1></div></div>
      <div class="card vazio grande">${icone(item?.rota)}<h2>Em breve</h2><p>Esta tela faz parte da próxima leva.</p>
      <a class="btn sec" href="#dashboard">Voltar ao Dashboard</a></div>`;
  }
};
