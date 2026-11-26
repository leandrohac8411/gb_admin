// Portal do aluno: uma aula (foto, tema, técnicas e roteiro) e, para quem esteve, o "Meu diário".
import { aulasDoDia, esteveNaAula, diarioValido } from "../../logica/portal-aluno.js";
import { dataValida } from "../../logica/datas.js";
import { esc, horaTexto, dataLonga, toast } from "../ui/util.js";
import { etiqueta } from "./comum.js";

const RES = [["nao", "Não saiu"], ["asvezes", "Às vezes"], ["bem", "Saiu bem"]];
const hhmm = m => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export default {
  menu: null,
  vivo: false,
  montar(el, [turmaId, data], ctx) {
    if (!turmaId || !dataValida(data || "")) { el.innerHTML = '<p class="vazio">Aula não encontrada. <a class="link" href="#aulas">Ver aulas</a></p>'; return; }
    const a = aulasDoDia(ctx.grade, data).find(x => x.turmaId === turmaId);
    const pres = (ctx.portal?.presencas || []).find(x => x.turmaId === turmaId && x.data === data);
    const horario = a?.horario || pres?.horario || "", programa = a?.programa || pres?.programa || "";
    const esteve = esteveNaAula(ctx.portal, ctx.pendentes, turmaId, data);
    const salvo = ctx.diario.find(x => x.turmaId === turmaId && x.data === data) || {};
    const tecnicas = [...new Set([...(a?.temas || []).flatMap(t => t.tecnicas.map(x => x.nome)), ...(salvo.tecnicas || []).map(x => x.nome)])];
    const resultado = Object.fromEntries((salvo.tecnicas || []).map(x => [x.nome, x.resultado]));
    let dificuldade = salvo.dificuldade || null;
    const [h0, m0] = (horario || "0:0").split(":").map(Number);
    let acum = 0;
    el.innerHTML = `<div class="ttl"><a class="back" href="#aulas" aria-label="Voltar">←</a>Aula</div>
      <div class="aula-foto" id="foto" hidden></div>
      <div class="card"><small class="muted">${dataLonga(data)}${horario ? ` · ${horaTexto(horario)}` : ""}${a?.professor ? ` · ${esc(a.professor)}` : ""}</small>
        <div style="margin:6px 0">${etiqueta(programa)}</div>
        ${(a?.temas || []).map(t => `<b class="aula-tema">${esc(t.tema)}</b><small class="muted">Semana ${esc(t.semana)} · Aula ${esc(t.aula)}</small>
          ${t.tecnicas.length ? `<ol class="aula-tecnicas">${t.tecnicas.map(x => `<li>${esc(x.nome)}${x.categoria ? ` <small class="muted">${esc(x.categoria)}</small>` : ""}</li>`).join("")}</ol>` : ""}`).join("") || '<p class="muted">Tema desta aula não informado.</p>'}</div>
      ${a?.roteiro?.length ? `<div class="card"><div class="k">Roteiro</div><ol class="aula-roteiro">${a.roteiro.map(b => { const ini = acum; acum += Number(b.min) || 0;
        return `<li><span>${horaTexto(hhmm(h0 * 60 + m0 + ini))}</span><b>${esc(b.nome)}</b><small>${b.min} min</small></li>`; }).join("")}</ol></div>` : ""}
      ${esteve ? `<form class="card diario" id="diario" novalidate><div class="k">Meu diário</div>
          <label for="aprendi">O que aprendi</label><textarea class="input" id="aprendi" rows="4" maxlength="4000" placeholder="Detalhes, ajustes, o que o professor corrigiu…">${esc(salvo.aprendi || "")}</textarea>
          <label for="revisar">O que revisar</label><textarea class="input" id="revisar" rows="3" maxlength="4000" placeholder="O que ainda não saiu…">${esc(salvo.revisar || "")}</textarea>
          <div class="k" style="margin-top:6px">Dificuldade</div><div class="dif" id="dif">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-dif="${n}" aria-pressed="${dificuldade === n}">${n}</button>`).join("")}</div>
          ${tecnicas.length ? `<div class="k" style="margin-top:6px">Como foram as técnicas</div>${tecnicas.map((nome, i) => `<div class="tec"><span>${esc(nome)}</span><div class="seg">${RES.map(([v, t]) =>
            `<button type="button" data-tec="${i}" data-res="${v}" aria-pressed="${resultado[nome] === v}">${t}</button>`).join("")}</div></div>`).join("")}` : ""}
          <button class="btn bloco" id="salvar">Salvar diário</button></form>`
        : '<p class="aviso">Você não fez check-in nesta aula. Dá para ver o tema e a foto, mas o diário é só de quem treinou.</p>'}`;
    ctx.nuvem.fotoDaAula(turmaId, data).then(f => {
      const box = el.querySelector("#foto");
      if (!f?.foto || !box) return;
      box.hidden = false;
      box.innerHTML = `<img src="${esc(f.foto)}" alt="Foto da aula">${f.legenda ? `<small>${esc(f.legenda)}</small>` : ""}`;
    }).catch(e => console.error(e));
    const form = el.querySelector("#diario");
    if (!form) return;
    form.querySelectorAll("[data-dif]").forEach(b => b.onclick = () => {
      dificuldade = dificuldade === Number(b.dataset.dif) ? null : Number(b.dataset.dif);
      form.querySelectorAll("[data-dif]").forEach(x => x.setAttribute("aria-pressed", String(Number(x.dataset.dif) === dificuldade)));
    });
    form.querySelectorAll("[data-tec]").forEach(b => b.onclick = () => {
      const nome = tecnicas[Number(b.dataset.tec)];
      resultado[nome] = resultado[nome] === b.dataset.res ? undefined : b.dataset.res;
      form.querySelectorAll(`[data-tec="${b.dataset.tec}"]`).forEach(x => x.setAttribute("aria-pressed", String(x.dataset.res === resultado[nome])));
    });
    form.onsubmit = async e => {
      e.preventDefault();
      const dados = diarioValido({ aprendi: form.querySelector("#aprendi").value, revisar: form.querySelector("#revisar").value, dificuldade,
        tecnicas: tecnicas.filter(n => resultado[n]).map(nome => ({ nome, resultado: resultado[nome] })) });
      if (!dados) { toast("Confira o diário: texto muito longo?"); return; }
      form.querySelector("#salvar").disabled = true;
      try { await ctx.nuvem.salvarDiario(ctx.acesso.alunoId, turmaId, data, dados); toast("Diário salvo"); }
      catch (err) { console.error(err); toast("Não consegui salvar. Confira a internet e tente de novo."); }
      form.querySelector("#salvar").disabled = false;
    };
  }
};
