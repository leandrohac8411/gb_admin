// Check-ins: presença por dia e turma, registro manual e remoção.
import { esc, abrirFolha, perguntar, toast, horaTexto, dataLonga } from "../ui/util.js";
import { normalizar } from "../ui/util-admin.js";
import { hojeISO, diaSemana, dataValida, somarDias } from "../logica/datas.js";
import { icone } from "../menu.js";
import { comprimirImagem } from "../foto.js";
import { cabecalho, etiquetaPrograma, nomeProfessor, pessoa, faixaCelula, porId, DIAS_LONGOS, aba, daAba, abasCategoria, ligarAbas, definirAba } from "./comum.js";

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
    if (!Array.isArray(d.fotosAula)) d.fotosAula = [];
    if (params[0]) {
      estado.data = hoje; estado.turmaId = params[0];
      const t = d.turmas.find(x => x.id === params[0]); if (t) definirAba(t.categoria);
      history.replaceState(null, "", "#checkins");
    }
    if (!estado.data || !dataValida(estado.data)) estado.data = hoje;
    const data = estado.data, turmas = d.turmas.filter(t => t.diaSemana === diaSemana(data) && (t.categoria || "adulto") === aba()).sort((a, b) => a.horario.localeCompare(b.horario));
    const idsDoDia = new Set(turmas.map(t => t.id)), doDia = d.checkins.filter(c => c.data === data && idsDoDia.has(c.turmaId));
    // Presenças de turmas que mudaram de dia ou foram excluídas ficam em "Turmas antigas".
    const alunos = porId(d.alunos);
    const idsOutraAba = new Set(d.turmas.filter(t => (t.categoria || "adulto") !== aba()).map(t => t.id));
    const orfaos = d.checkins.filter(c => c.data === data && !idsDoDia.has(c.turmaId) && !idsOutraAba.has(c.turmaId) && daAba(alunos[c.alunoId] || {}));
    if (!(estado.turmaId === "outras" && orfaos.length) && !turmas.some(t => t.id === estado.turmaId)) estado.turmaId = turmas[0]?.id || (orfaos.length ? "outras" : null);
    const turma = turmas.find(t => t.id === estado.turmaId);
    const presentes = estado.turmaId === "outras" ? orfaos : turma ? doDia.filter(c => c.turmaId === turma.id).sort((a, b) => (alunos[a.alunoId]?.nome || "").localeCompare(alunos[b.alunoId]?.nome || "", "pt-BR")) : [];

    el.innerHTML = cabecalho("Check-ins", `${doDia.length} presença${doDia.length === 1 ? "" : "s"} em ${dataLonga(data)}`,
      `<div class="dia-aula"><label for="data" class="k">Dia da aula</label><div class="dia-aula-ctl">
        <button class="btn sec peq" id="dia-ant" aria-label="Dia anterior">‹</button>
        <input class="input" type="date" id="data" value="${data}" max="${hoje}" style="width:auto">
        <button class="btn sec peq" id="dia-prox" aria-label="Próximo dia"${data >= hoje ? " disabled" : ""}>›</button>
        ${data !== hoje ? '<button class="link" id="dia-hoje">Hoje</button>' : ""}</div></div>`) +
      abasCategoria(d) +
      `<div class="card">${turmas.length || orfaos.length ? `<div class="k" style="margin-bottom:8px">Escolha a aula</div><div class="aulas-dia" id="turmas">${turmas.map(t => `<button class="aula-opcao${t.id === estado.turmaId ? " on" : ""}" data-id="${esc(t.id)}" aria-pressed="${t.id === estado.turmaId}"><b>${horaTexto(t.horario)}</b>${etiquetaPrograma(t.programa)}<small>Prof. ${esc(nomeProfessor(d, t.professorId))}${t.publico ? ` · ${esc(t.publico)}` : ""}</small><small>${doDia.filter(c => c.turmaId === t.id).length} presentes${d.fotosAula.some(f => f.turmaId === t.id && f.data === data) ? " · 📸" : ""}</small></button>`).join("")}${orfaos.length ? `<button class="aula-opcao${estado.turmaId === "outras" ? " on" : ""}" data-id="outras"><b>Turmas antigas</b><small>${orfaos.length} presenças</small></button>` : ""}</div>`
        : `<div class="vazio">Sem aulas em ${DIAS_LONGOS[diaSemana(data)].toLowerCase()}.</div>`}</div>
      ${estado.turmaId === "outras" ? `<div class="card"><div class="card-cab"><div><h3>Turmas antigas</h3><small>presenças de turmas que mudaram de dia ou foram excluídas</small></div></div>${presentes.map(c => { const a = alunos[c.alunoId]; return `<div class="lista"><div>${a ? pessoa(a) : "Aluno removido"}<span class="hora" style="margin-left:auto">${horaTexto(c.hora)}</span></div></div>`; }).join("")}</div>` : ""}
      ${turma ? (() => { const vis = d.prospects.filter(p => p.etapa === "experimental" && p.experimental?.turmaId === turma.id && p.experimental?.data === data);
        return vis.length ? `<div class="card" style="border-color:#bfe3cf;background:#f4fbf7"><div class="card-cab"><h3>Aula experimental</h3><a class="link" href="#prospects">Prospects</a></div>
          <div class="lista">${vis.map(p => `<div><div class="cresce"><b>${esc(p.nome)}</b><small>${esc(p.interesse)} · ${esc(p.telefone)}</small></div><span class="pill ok">Visitante</span></div>`).join("")}</div></div>` : ""; })() : ""}
      ${turma ? (() => { const f = d.fotosAula.find(x => x.turmaId === turma.id && x.data === data);
        return `<div class="card foto-aula"><div class="card-cab"><div><h3>Foto da aula das ${horaTexto(turma.horario)} ${etiquetaPrograma(turma.programa)}</h3><small>${DIAS_LONGOS[diaSemana(data)]}, ${dataLonga(data)} · ${f ? `salva por Prof. ${esc(nomeProfessor(d, turma.professorId))}` : "o professor registra como foi a aula"}</small></div>
          ${f ? `<div style="display:flex;gap:8px"><label class="btn sec peq" style="cursor:pointer">Trocar<input type="file" accept="image/*" capture="environment" id="foto-arq" hidden></label><button class="btn sec peq" id="foto-del">Remover</button></div>` : ""}</div>
          ${f ? `<button class="foto-grande" id="foto-ver" aria-label="Ver foto da aula em tela cheia"><img src="${esc(f.foto)}" alt="Foto da aula de ${esc(dataLonga(data))}"></button>
            <input class="input" id="foto-leg" placeholder="Legenda (ex.: drill de passagem com a turma toda)" value="${esc(f.legenda || "")}" maxlength="140" style="margin-top:10px">`
          : `<label class="foto-vazia">${icone("camera")}<b>Adicionar foto da aula</b><small>Tire na hora ou escolha da galeria · uma foto por aula</small>
              <input type="file" accept="image/*" capture="environment" id="foto-arq" hidden></label>`}</div>`; })() : ""}
      ${turma ? `<div class="card"><div class="card-cab"><div><h3>${horaTexto(turma.horario)} · ${etiquetaPrograma(turma.programa)}</h3><small>Prof. ${esc(nomeProfessor(d, turma.professorId))} · ${presentes.length} presente${presentes.length === 1 ? "" : "s"}</small></div>
          <button class="btn" id="registrar">${icone("checkins")}Registrar presença</button></div>
        ${presentes.length ? `<table class="tabela resp"><thead><tr><th>Aluno</th><th>Faixa</th><th>Hora</th><th></th></tr></thead><tbody>${presentes.map(c => {
          const a = alunos[c.alunoId];
          return `<tr><td class="cheia">${a ? `<a href="#aluno/${encodeURIComponent(a.id)}">${pessoa(a)}</a>` : "Aluno removido"}</td><td>${a ? faixaCelula(a) : ""}</td><td>${horaTexto(c.hora)}</td>
            <td class="num"><button class="btn sec peq" data-remover="${esc(c.id)}" aria-label="Remover presença">Remover</button></td></tr>`;
        }).join("")}</tbody></table>` : `<div class="vazio">Nenhuma presença registrada nesta aula.</div>`}</div>` : ""}`;

    const irPara = iso => { estado.data = iso; estado.turmaId = null; ctx.redesenhar(); };
    el.querySelector("#dia-ant").onclick = () => irPara(somarDias(data, -1));
    el.querySelector("#dia-prox").onclick = () => { if (data < hoje) irPara(somarDias(data, 1)); };
    el.querySelector("#dia-hoje")?.addEventListener("click", () => irPara(hoje));
    el.querySelector("#data").onchange = e => {
      if (dataValida(e.target.value) && e.target.value <= hoje) estado.data = e.target.value;
      else toast("Escolha uma data até hoje.");
      ctx.redesenhar();
    };
    ligarAbas(el, ctx, () => { estado.turmaId = null; });
    el.querySelectorAll("#turmas [data-id]").forEach(b => b.onclick = () => { estado.turmaId = b.dataset.id; ctx.redesenhar(); });
    // Foto da aula: comprime no aparelho e guarda uma por turma e dia.
    el.querySelector("#foto-arq")?.addEventListener("change", async e => {
      const arq = e.target.files?.[0]; e.target.value = "";
      if (!arq || !turma) return;
      if (!arq.type.startsWith("image/")) { toast("Escolha um arquivo de imagem"); return; }
      toast("Preparando a foto…");
      let foto;
      try { foto = (await comprimirImagem(arq, 1280, 220 * 1024)).dados; }
      catch { toast("Não deu para ler essa imagem"); return; }
      const antiga = d.fotosAula.find(x => x.turmaId === turma.id && x.data === data);
      const nova = { id: store.novoId("fa"), turmaId: turma.id, data, foto, legenda: antiga?.legenda || "", professorId: turma.professorId };
      d.fotosAula = d.fotosAula.filter(x => x !== antiga).concat(nova);
      if (!store.salvar()) {
        d.fotosAula = d.fotosAula.filter(x => x !== nova).concat(antiga ? [antiga] : []);
        toast("Sem espaço no navegador para mais fotos. Remova fotos antigas.");
      } else toast(antiga ? "Foto trocada" : "Foto da aula salva 📸");
      ctx.redesenhar();
    });
    el.querySelector("#foto-leg")?.addEventListener("change", e => {
      const f = d.fotosAula.find(x => x.turmaId === turma.id && x.data === data);
      if (f) { f.legenda = e.target.value.trim().slice(0, 140); store.salvar(); toast("Legenda salva"); }
    });
    el.querySelector("#foto-del")?.addEventListener("click", async () => {
      if (!await perguntar("Remover a foto da aula?", "Ela sai do painel e não dá para desfazer.", "Remover", "Cancelar")) return;
      d.fotosAula = d.fotosAula.filter(x => !(x.turmaId === turma.id && x.data === data));
      store.salvar(); toast("Foto removida"); ctx.redesenhar();
    });
    el.querySelector("#foto-ver")?.addEventListener("click", () => {
      const f = d.fotosAula.find(x => x.turmaId === turma.id && x.data === data);
      if (!f) return;
      abrirFolha((fl, fechar) => {
        fl.classList.add("folha-foto");
        fl.innerHTML = `<img src="${esc(f.foto)}" alt="Foto da aula"><p class="muted" style="margin:0">${esc(f.legenda || "")}</p><button class="btn ghost bloco" id="ff-x">Fechar</button>`;
        fl.querySelector("#ff-x").onclick = fechar;
      });
    });
    el.querySelector("#registrar")?.addEventListener("click", () => abrirRegistro(store, turma, data, ctx.redesenhar));
    el.querySelectorAll("[data-remover]").forEach(b => b.onclick = async () => {
      const c = d.checkins.find(x => x.id === b.dataset.remover), a = alunos[c?.alunoId];
      if (!c || !await perguntar("Remover presença?", `${a?.nome || "Aluno"} sai da lista desta aula.`, "Remover", "Cancelar")) return;
      d.checkins = d.checkins.filter(x => x.id !== c.id);
      store.salvar(); toast("Presença removida"); ctx.redesenhar();
    });
  }
};
