// Portal do aluno: aulas da academia, dia a dia (tema, professor, foto e "você esteve").
import { hojeISO, somarDias, dataValida } from "../../logica/datas.js";
import { aulasDoDiaDoAluno, esteveNaAula } from "../../logica/portal-aluno.js";
import { esc, horaTexto, dataCurta } from "../ui/util.js";
import { etiqueta } from "./comum.js";

const estado = { dia: null };
const fotos = new Map(); // dia -> Set(turmaId) com foto (busca uma vez por dia, aula por aula: as regras do banco
                         // não deixam o aluno listar as fotos do dia inteiro)

export default {
  menu: "aulas",
  montar(el, params, ctx) {
    const hoje = hojeISO();
    if (!estado.dia || !dataValida(estado.dia) || estado.dia > hoje) estado.dia = hoje;
    const dia = estado.dia, aulas = aulasDoDiaDoAluno(ctx.grade, dia, ctx.portal, ctx.pendentes);
    if (!fotos.has(dia)) {
      fotos.set(dia, null);
      const aqui = location.hash;
      Promise.all(aulas.map(a => ctx.nuvem.fotoDaAula(a.turmaId, dia).then(f => (f ? a.turmaId : null)).catch(() => null)))
        .then(ids => { fotos.set(dia, new Set(ids.filter(Boolean))); if (location.hash === aqui && estado.dia === dia) this.montar(el, params, ctx); });
    }
    const comFoto = fotos.get(dia) || new Set();
    el.innerHTML = `<div class="ttl">Aulas</div>
      <div class="dia-nav"><button class="btn ghost" id="ant" aria-label="Dia anterior">‹</button><b>${dia === hoje ? "Hoje · " : ""}${dataCurta(dia)}</b>
        <button class="btn ghost" id="prox" aria-label="Próximo dia"${dia >= hoje ? " disabled" : ""}>›</button></div>
      ${aulas.length ? `<div class="cls">${aulas.map(a => {
        const esteve = esteveNaAula(ctx.portal, ctx.pendentes, a.turmaId, dia);
        return `<a class="row${esteve ? " feito" : ""}" href="#aula/${encodeURIComponent(a.turmaId)}/${dia}" style="text-decoration:none;color:inherit">
          <span class="t">${horaTexto(a.horario)}</span>
          <span class="d">${etiqueta(a.programa)}${a.professor ? ` ${esc(a.professor)}` : ""}<small>${esc(a.temas.map(t => t.tema).join(" · ") || "tema a definir")}${comFoto.has(a.turmaId) ? " · 📸 foto" : ""}</small></span>
          <span class="go">${esteve ? "Você esteve" : "Ver"}</span></a>`;
      }).join("")}</div>` : '<p class="vazio">Sem aula neste dia.</p>'}`;
    el.querySelector("#ant").onclick = () => { estado.dia = somarDias(dia, -1); this.montar(el, params, ctx); };
    el.querySelector("#prox").onclick = () => { if (dia < hoje) { estado.dia = somarDias(dia, 1); this.montar(el, params, ctx); } };
  }
};
