// Agenda & turmas: grade da semana (seg–sáb), semana do ciclo GB1/GB2 e edição de turmas.
import { esc, abrirFolha, perguntar, toast, horaTexto } from "../ui/util.js";
import { hojeISO, segundaDaSemana, somarDias } from "../logica/datas.js";
import { semanaDoCiclo, aulaPadrao } from "../logica/ciclo.js";
import { icone } from "../menu.js";
import { cabecalho, etiquetaPrograma, nomeProfessor, DIAS_CURTOS, DIAS_LONGOS } from "./comum.js";
import { publicoKids } from "../dados-ficticios.js";

const estado = { semana: 0 };

const programaDe = (gb1, gb2) => (gb1 && gb2 ? "GB1+GB2" : gb1 ? "GB1" : gb2 ? "GB2" : null);

function abrirFormTurma(store, turma, aoSalvar) {
  const d = store.dados, nova = !turma;
  const t = turma || { diaSemana: 1, horario: "19:00", programa: "GB1", professorId: d.professores[0]?.id };
  let gb1 = t.programa.includes("GB1"), gb2 = t.programa.includes("GB2"), kids = t.programa === "Kids";
  abrirFolha((el, fechar) => {
    el.innerHTML = `<h3>${nova ? "Nova turma" : `Turma de ${DIAS_LONGOS[t.diaSemana].toLowerCase()} · ${horaTexto(t.horario)}`}</h3>
      <form class="campos" novalidate>
        <div class="field"><label for="t-dia">Dia</label><select class="input" id="t-dia">${[1, 2, 3, 4, 5, 6].map(i => `<option value="${i}"${t.diaSemana === i ? " selected" : ""}>${DIAS_LONGOS[i]}</option>`).join("")}</select></div>
        <div class="field"><label for="t-hora">Horário</label><input class="input" type="time" id="t-hora" value="${esc(t.horario)}" required></div>
        <div class="field cheio"><label>Currículo (marque os dois para turma junta)</label>
          <div class="chips"><button type="button" class="chip${gb1 ? " on" : ""}" data-p="1">GB1</button><button type="button" class="chip${gb2 ? " on" : ""}" data-p="2">GB2</button><button type="button" class="chip${kids ? " on" : ""}" data-p="k">Kids</button></div></div>
        <div class="field" id="t-idades"${kids ? "" : " hidden"}><label for="t-imin">Idade mínima</label><input class="input" type="number" min="3" max="17" id="t-imin" value="${esc(t.idadeMin ?? 4)}"></div>
        <div class="field" id="t-idades2"${kids ? "" : " hidden"}><label for="t-imax">Idade máxima</label><input class="input" type="number" min="3" max="17" id="t-imax" value="${esc(t.idadeMax ?? 6)}"></div>
        <div class="field cheio"><label for="t-prof">Professor</label><select class="input" id="t-prof">${d.professores.map(p => `<option value="${p.id}"${t.professorId === p.id ? " selected" : ""}>${esc(p.nome)}</option>`).join("")}</select></div>
        <p class="aviso cheio" id="t-erro" hidden></p>
        <div class="acoes cheio"><button type="button" class="btn ghost" id="t-cancelar">Cancelar</button><button class="btn" type="submit">${nova ? "Criar turma" : "Salvar"}</button></div>
        ${nova ? "" : `<button type="button" class="link cheio" id="t-excluir" style="justify-self:center">Excluir turma</button>`}
      </form>`;
    const erro = el.querySelector("#t-erro");
    const pintar = () => {
      el.querySelector('[data-p="1"]').classList.toggle("on", gb1); el.querySelector('[data-p="2"]').classList.toggle("on", gb2);
      el.querySelector('[data-p="k"]').classList.toggle("on", kids);
      el.querySelector("#t-idades").hidden = el.querySelector("#t-idades2").hidden = !kids;
    };
    el.querySelectorAll("[data-p]").forEach(b => b.onclick = () => {
      if (b.dataset.p === "k") { kids = !kids; if (kids) gb1 = gb2 = false; }
      else { kids = false; if (b.dataset.p === "1") gb1 = !gb1; else gb2 = !gb2; }
      pintar();
    });
    el.querySelector("#t-cancelar").onclick = fechar;
    el.querySelector("#t-excluir")?.addEventListener("click", async () => {
      fechar();
      if (!await perguntar("Excluir turma?", "Ela sai da grade. Os check-ins já feitos continuam no histórico dos alunos.", "Excluir", "Cancelar")) return;
      d.turmas = d.turmas.filter(x => x.id !== turma.id);
      store.salvar(); toast("Turma excluída"); aoSalvar();
    });
    el.querySelector("form").onsubmit = e => {
      e.preventDefault();
      const diaSemana = Number(el.querySelector("#t-dia").value), horario = el.querySelector("#t-hora").value, programa = kids ? "Kids" : programaDe(gb1, gb2);
      const imin = Number(el.querySelector("#t-imin").value), imax = Number(el.querySelector("#t-imax").value);
      const falha = !/^\d{2}:\d{2}$/.test(horario) ? "Escolha o horário."
        : !programa ? "Marque GB1, GB2 (ou os dois) ou Kids."
        : kids && !(Number.isInteger(imin) && Number.isInteger(imax) && imin >= 3 && imax <= 17 && imin <= imax) ? "Idades entre 3 e 17 anos, mínima menor ou igual à máxima."
        : d.turmas.some(x => x !== turma && x.diaSemana === diaSemana && x.horario === horario) ? "Já existe uma turma nesse dia e horário." : "";
      if (falha) { erro.textContent = falha; erro.hidden = false; return; }
      const campos = { diaSemana, horario, programa, professorId: el.querySelector("#t-prof").value, categoria: kids ? "kids" : "adulto",
        ...(kids ? { idadeMin: imin, idadeMax: imax, publico: publicoKids(imin, imax) } : { idadeMin: undefined, idadeMax: undefined, publico: undefined }) };
      if (nova) d.turmas.push({ id: store.novoId("t"), ...campos, duracaoMin: kids ? 50 : 60 });
      else {
        const trocouCategoria = (turma.categoria || "adulto") !== campos.categoria && d.checkins.some(c => c.turmaId === turma.id);
        Object.assign(turma, campos);
        if (trocouCategoria) turma.id = store.novoId("t");
      }
      store.salvar(); fechar(); toast(nova ? "Turma criada" : "Turma salva"); aoSalvar();
    };
  });
}

export default {
  titulo: "Agenda & turmas",
  montar(el, params, ctx) {
    const { store } = ctx, d = store.dados, hoje = hojeISO();
    const segunda = somarDias(segundaDaSemana(hoje), 7 * estado.semana);
    const dias = [1, 2, 3, 4, 5, 6].map(i => ({ i, data: somarDias(segunda, i - 1) }));
    const fim = dias[5].data;
    const contagem = {};
    for (const c of d.checkins) if (c.data >= segunda && c.data <= fim) contagem[c.turmaId + c.data] = (contagem[c.turmaId + c.data] || 0) + 1;
    const ab = data => aulaPadrao(data);

    el.innerHTML = cabecalho("Agenda & turmas", `${d.turmas.filter(t => t.categoria !== "kids").length} turmas adultas e ${d.turmas.filter(t => t.categoria === "kids").length} kids na semana`,
      `<button class="btn" id="nova">${icone("agenda")}Nova turma</button>`) +
      `<div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:8px">
          <button class="btn sec peq" id="ant" aria-label="Semana anterior">‹</button>
          <b>${segunda.slice(8)}/${segunda.slice(5, 7)} a ${fim.slice(8)}/${fim.slice(5, 7)}</b>
          <button class="btn sec peq" id="prox" aria-label="Próxima semana">›</button>
          ${estado.semana ? `<button class="link" id="hoje">Voltar para esta semana</button>` : ""}
        </div>
        <div class="ciclo"><span class="pill gb1-p" style="background:var(--red-soft);color:var(--red)">GB1 · semana ${semanaDoCiclo(segunda, d.config.ancoras, "GB1")} de 16</span>
          <span class="pill info">GB2 · semana ${semanaDoCiclo(segunda, d.config.ancoras, "GB2")} de 16</span></div>
      </div>
      <div class="semana">${dias.map(({ i, data }) => {
        const turmas = d.turmas.filter(t => t.diaSemana === i).sort((a, b) => a.horario.localeCompare(b.horario));
        return `<div class="dia"><h4 class="${data === hoje ? "hoje" : ""}"><span>${DIAS_CURTOS[i]} ${data.slice(8)}/${data.slice(5, 7)}</span>${ab(data) ? `<span>Aula ${ab(data)}</span>` : ""}</h4>
          <div class="turmas">${turmas.length ? turmas.map(t => `<button class="turma" data-id="${esc(t.id)}">
            <div class="linha"><span class="hora">${horaTexto(t.horario)}</span>${etiquetaPrograma(t.programa)}</div>
            <small>${t.publico ? `${esc(t.publico)} · ` : ""}${esc(nomeProfessor(d, t.professorId))}</small>
            <small>${data <= hoje ? `${contagem[t.id + data] || 0} check-ins` : "—"}</small>${(() => { const n = d.prospects.filter(p => p.etapa === "experimental" && p.experimental?.turmaId === t.id && p.experimental?.data === data).length;
              return n ? `<span class="pill ok" style="align-self:flex-start">+${n} experimental</span>` : ""; })()}</button>`).join("") : `<div class="vazio">Sem turmas</div>`}</div></div>`;
      }).join("")}</div>`;

    el.querySelector("#ant").onclick = () => { estado.semana--; ctx.redesenhar(); };
    el.querySelector("#prox").onclick = () => { estado.semana++; ctx.redesenhar(); };
    el.querySelector("#hoje")?.addEventListener("click", () => { estado.semana = 0; ctx.redesenhar(); });
    el.querySelector("#nova").onclick = () => abrirFormTurma(store, null, ctx.redesenhar);
    el.querySelectorAll(".turma[data-id]").forEach(b => b.onclick = () => abrirFormTurma(store, d.turmas.find(t => t.id === b.dataset.id), ctx.redesenhar));
  }
};
