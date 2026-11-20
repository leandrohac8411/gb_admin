// Check-ins: presença por dia e turma, registro manual e remoção.
import { esc, abrirFolha, perguntar, toast, horaTexto, dataLonga } from "../ui/util.js";
import { normalizar } from "../ui/util-admin.js";
import { hojeISO, diaSemana, dataValida } from "../logica/datas.js";
import { icone } from "../menu.js";
import { cabecalho, etiquetaPrograma, nomeProfessor, pessoa, faixaCelula, porId, DIAS_LONGOS, aba, daAba, abasCategoria, ligarAbas } from "./comum.js";

const estado = { data: null, turmaId: null };

function abrirRegistro(store, turma, data, aoFechar) {
  const d = store.dados;
  abrirFolha((el, fechar) => {
    el.innerHTML = `<h3>Registrar presença</h3><p class="muted" style="margin:0">${DIAS_LONGOS[turma.diaSemana]}, ${dataLonga(data)} · ${horaTexto(turma.horario)}</p>
      <label class="busca" style="max-width:none">${icone("alunos")}<input id="r-busca" type="search" placeholder="Buscar aluno" aria-label="Buscar aluno" autocomplete="off"></label>
      <div class="lista" id="r-lista" style="max-height:50vh;overflow:auto"></div>
      <button class="btn ghost bloco" id="r-fechar">Fechar</button>`;
    const lista = el.querySelector("#r-lista");
    const desenhar = () => {
      const presentes = new Set(d.checkins.filter(c => c.turmaId === turma.id && c.data === data).map(c => c.alunoId));
      const q = normalizar(el.querySelector("#r-busca").value);
      const opcoes = d.alunos.filter(a => a.status === "ativo" && (a.categoria || "adulto") === (turma.categoria || "adulto") && !presentes.has(a.id) && (!q || normalizar(a.nome).includes(q)))
        .sort((x, y) => x.nome.localeCompare(y.nome, "pt-BR")).slice(0, 40);
      lista.innerHTML = opcoes.length ? opcoes.map(a => `<button data-id="${esc(a.id)}" style="text-align:left;width:100%">${pessoa(a)}<span class="link" style="margin-left:auto">Marcar</span></button>`).join("")
        : `<div class="vazio">Ninguém para marcar com essa busca.</div>`;
      lista.querySelectorAll("[data-id]").forEach(b => b.onclick = () => {
        const a = d.alunos.find(x => x.id === b.dataset.id);
        if (d.checkins.some(c => c.alunoId === a.id && c.turmaId === turma.id && c.data === data)) { toast(`${a.nome.split(" ")[0]} já está presente`); return; }
        d.checkins.push({ id: store.novoId("c"), alunoId: a.id, turmaId: turma.id, data, hora: turma.horario });
        store.salvar(); toast(`Presença de ${a.nome.split(" ")[0]} registrada`); desenhar();
      });
    };
    el.querySelector("#r-busca").oninput = desenhar;
    el.querySelector("#r-fechar").onclick = () => { fechar(); aoFechar(); };
    desenhar();
    el.querySelector("#r-busca").focus();
  }, aoFechar);
}

export default {
  titulo: "Check-ins",
  montar(el, params, ctx) {
    const { store } = ctx, d = store.dados, hoje = hojeISO();
    if (params[0]) { estado.data = hoje; estado.turmaId = params[0]; history.replaceState(null, "", "#checkins"); }
    if (!estado.data || !dataValida(estado.data)) estado.data = hoje;
    const data = estado.data, turmas = d.turmas.filter(t => t.diaSemana === diaSemana(data) && (t.categoria || "adulto") === aba()).sort((a, b) => a.horario.localeCompare(b.horario));
    const idsDoDia = new Set(turmas.map(t => t.id)), doDia = d.checkins.filter(c => c.data === data && idsDoDia.has(c.turmaId));
    // Presenças de turmas que mudaram de dia ou foram excluídas ficam em "Turmas antigas".
    const idsOutraAba = new Set(d.turmas.filter(t => (t.categoria || "adulto") !== aba()).map(t => t.id));
    const orfaos = d.checkins.filter(c => c.data === data && !idsDoDia.has(c.turmaId) && !idsOutraAba.has(c.turmaId) && daAba(porId(d.alunos)[c.alunoId] || {}));
    if (!(estado.turmaId === "outras" && orfaos.length) && !turmas.some(t => t.id === estado.turmaId)) estado.turmaId = turmas[0]?.id || (orfaos.length ? "outras" : null);
    const turma = turmas.find(t => t.id === estado.turmaId);
    const alunos = porId(d.alunos);
    const presentes = estado.turmaId === "outras" ? orfaos : turma ? doDia.filter(c => c.turmaId === turma.id).sort((a, b) => (alunos[a.alunoId]?.nome || "").localeCompare(alunos[b.alunoId]?.nome || "", "pt-BR")) : [];

    el.innerHTML = cabecalho("Check-ins", `${doDia.length} presença${doDia.length === 1 ? "" : "s"} em ${dataLonga(data)}`,
      `<input class="input" type="date" id="data" value="${data}" max="${hoje}" style="width:auto" aria-label="Data">`) +
      abasCategoria(d) +
      `<div class="card">${turmas.length || orfaos.length ? `<div class="chips" id="turmas">${turmas.map(t => `<button class="chip${t.id === estado.turmaId ? " on" : ""}" data-id="${esc(t.id)}">${horaTexto(t.horario)} · ${doDia.filter(c => c.turmaId === t.id).length}</button>`).join("")}${orfaos.length ? `<button class="chip${estado.turmaId === "outras" ? " on" : ""}" data-id="outras">Turmas antigas · ${orfaos.length}</button>` : ""}</div>`
        : `<div class="vazio">Sem aulas em ${DIAS_LONGOS[diaSemana(data)].toLowerCase()}.</div>`}</div>
      ${estado.turmaId === "outras" ? `<div class="card"><div class="card-cab"><div><h3>Turmas antigas</h3><small>presenças de turmas que mudaram de dia ou foram excluídas</small></div></div>${presentes.map(c => { const a = alunos[c.alunoId]; return `<div class="lista"><div>${a ? pessoa(a) : "Aluno removido"}<span class="hora" style="margin-left:auto">${horaTexto(c.hora)}</span></div></div>`; }).join("")}</div>` : ""}
      ${turma ? `<div class="card"><div class="card-cab"><div><h3>${horaTexto(turma.horario)} · ${etiquetaPrograma(turma.programa)}</h3><small>Prof. ${esc(nomeProfessor(d, turma.professorId))} · ${presentes.length} presente${presentes.length === 1 ? "" : "s"}</small></div>
          <button class="btn" id="registrar">${icone("checkins")}Registrar presença</button></div>
        ${presentes.length ? `<table class="tabela resp"><thead><tr><th>Aluno</th><th>Faixa</th><th>Hora</th><th></th></tr></thead><tbody>${presentes.map(c => {
          const a = alunos[c.alunoId];
          return `<tr><td class="cheia">${a ? `<a href="#aluno/${encodeURIComponent(a.id)}">${pessoa(a)}</a>` : "Aluno removido"}</td><td>${a ? faixaCelula(a) : ""}</td><td>${horaTexto(c.hora)}</td>
            <td class="num"><button class="btn sec peq" data-remover="${esc(c.id)}" aria-label="Remover presença">Remover</button></td></tr>`;
        }).join("")}</tbody></table>` : `<div class="vazio">Nenhuma presença registrada nesta aula.</div>`}</div>` : ""}`;

    el.querySelector("#data").onchange = e => {
      if (dataValida(e.target.value) && e.target.value <= hoje) estado.data = e.target.value;
      else toast("Escolha uma data até hoje.");
      ctx.redesenhar();
    };
    ligarAbas(el, ctx, () => { estado.turmaId = null; });
    el.querySelectorAll("#turmas [data-id]").forEach(b => b.onclick = () => { estado.turmaId = b.dataset.id; ctx.redesenhar(); });
    el.querySelector("#registrar")?.addEventListener("click", () => abrirRegistro(store, turma, data, ctx.redesenhar));
    el.querySelectorAll("[data-remover]").forEach(b => b.onclick = async () => {
      const c = d.checkins.find(x => x.id === b.dataset.remover), a = alunos[c?.alunoId];
      if (!c || !await perguntar("Remover presença?", `${a?.nome || "Aluno"} sai da lista desta aula.`, "Remover", "Cancelar")) return;
      d.checkins = d.checkins.filter(x => x.id !== c.id);
      store.salvar(); toast("Presença removida"); ctx.redesenhar();
    });
  }
};
