import { hojeISO, segundaDaSemana, somarDias, deISO } from "../logica/datas.js";
import { semanaDoCiclo, CICLO_SEMANAS } from "../logica/ciclo.js";
import { chaveCurriculo } from "../dados.js";
import { esc, temaCurto, posicaoDoTema, horaTexto } from "../ui/util.js";
import { turmasDoDia, etiquetaPrograma } from "./comum.js";

const NOMES = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
let diaEscolhido = null, semanas = 0; // semanas: 0 = esta, -1 = a passada... (até -4: a lista de presentes guarda 30 dias)

function temaDe(curriculo, programa, semana, aula) {
  const c = curriculo[chaveCurriculo(programa, semana)];
  const a = aula ? c?.[`aula${aula}`] : (c?.aulaA || c?.aulaB);
  return a?.tema || "";
}

export default {
  menu: "grade",
  vivo: true,
  montar(el, _p, { estado: e }) {
    const hoje = hojeISO();
    const seg = somarDias(segundaDaSemana(hoje), semanas * 7);
    const dias = [0, 1, 2, 3, 4, 5].map(i => somarDias(seg, i));
    if (!diaEscolhido || !dias.includes(diaEscolhido)) diaEscolhido = dias.includes(hoje) ? hoje : dias[dias.length - 1];
    const turmas = turmasDoDia(e.grade, diaEscolhido);

    const ciclos = ["GB1", "GB2"].map(p => {
      const s = semanaDoCiclo(diaEscolhido, e.ancoras, p);
      if (!s) return "";
      const tema = temaDe(e.curriculo, p, s);
      const prox = s % CICLO_SEMANAS + 1;
      const temaProx = temaDe(e.curriculo, p, prox);
      return `<div class="card cyc">
        <div class="k">Ciclo ${p} · semana ${s} de ${CICLO_SEMANAS}</div>
        <div class="cycbar" aria-hidden="true">${Array.from({ length: CICLO_SEMANAS }, (_, i) => `<i class="${i + 1 < s ? "done" : i + 1 === s ? "cur" : ""}"></i>`).join("")}</div>
        <h4>${esc(tema ? temaCurto(tema) : "Tema a registrar")}</h4>
        ${tema ? `<p>${esc(posicaoDoTema(tema))}</p>` : `<p>O tema desta semana ainda não foi cadastrado pela academia.</p>`}
        <div class="sec" style="font-weight:600"><span>Próxima · semana ${prox}</span><span>${esc(temaProx ? temaCurto(temaProx) : "a registrar")}</span></div>
      </div>`;
    }).join("");

    el.innerHTML = `
      <div class="ttl">Grade</div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
        <button class="chip" id="semAnt"${semanas <= -4 ? " disabled" : ""}>‹ Semana anterior</button>
        ${semanas < 0 ? '<button class="chip" id="semProx">Próxima semana ›</button>' : '<span class="muted" style="font-size:12px">Esta semana</span>'}
      </div>
      <div class="days">${dias.map(d => `<button data-dia="${d}" class="${d === diaEscolhido ? "on" : ""} ${d === hoje ? "tod" : ""}">${NOMES[new Date(d + "T12:00").getDay()]}<b>${deISO(d).dia}</b></button>`).join("")}</div>
      ${ciclos}
      <div class="cls">${turmas.map(t => `
        ${diaEscolhido <= hoje ? `<a class="row" href="#turma/${encodeURIComponent(t.id)}/${diaEscolhido}" style="text-decoration:none;color:inherit">` : '<div class="row">'}
          <span class="t">${esc(horaTexto(t.horario))}</span>
          <span class="d">${t.professor ? esc(t.professor) : "Professor a definir"}<small>${t.aula ? "Aula " + esc(t.aula) + " · " : ""}${esc(t.duracaoMin || 60)} min</small></span>
          ${etiquetaPrograma(t.programa)}
        ${diaEscolhido <= hoje ? "</a>" : "</div>"}`).join("") || '<p class="vazio">Sem turmas neste dia.</p>'}</div>
`;

    el.querySelectorAll("[data-dia]").forEach(b => b.onclick = () => { diaEscolhido = b.dataset.dia; this.montar(el, _p, { estado: e }); });
    el.querySelector("#semAnt").onclick = () => { if (semanas > -4) { semanas--; diaEscolhido = null; this.montar(el, _p, { estado: e }); } };
    el.querySelector("#semProx")?.addEventListener("click", () => { semanas++; diaEscolhido = null; this.montar(el, _p, { estado: e }); });
  }
};
