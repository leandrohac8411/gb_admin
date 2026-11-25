// Check-ins: presença por dia e turma, registro manual e remoção.
import { esc, abrirFolha, perguntar, toast, horaTexto, dataLonga } from "../ui/util.js";
import { normalizar } from "../ui/util-admin.js";
import { hojeISO, diaSemana, dataValida, somarDias } from "../logica/datas.js";
import { icone } from "../menu.js";
import { comprimirImagem } from "../foto.js";
import { detectarRostos, descreverRostos } from "../rostos.js";
import { reconhecer, cadastradosDe, escolhaInicial, alunosSemRosto, aprenderDescritor } from "../logica/reconhecimento.js";
import { recorte } from "../logica/cadastro-rosto.js";
import { guardarFotoDaAula } from "../logica/validar-nuvem.js";
import { sugerirPresenca } from "../logica/presenca-foto.js";
import { temaDaAula } from "../logica/tema.js";
import { cabecalho, etiquetaPrograma, nomeProfessor, pessoa, faixaCelula, porId, DIAS_LONGOS, aba, daAba, abasCategoria, ligarAbas, definirAba } from "./comum.js";

const estado = { data: null, turmaId: null };

function abrirRegistro(store, turma, data, aoFechar) {
  abrirFolha((el, fechar) => {
    el.innerHTML = `<h3>Registrar presença</h3><p class="muted" style="margin:0">${DIAS_LONGOS[turma.diaSemana]}, ${dataLonga(data)} · ${horaTexto(turma.horario)}</p>
      <label class="busca" style="max-width:none">${icone("alunos")}<input id="r-busca" type="search" placeholder="Buscar aluno" aria-label="Buscar aluno" autocomplete="off"></label>
      <div class="lista" id="r-lista" style="max-height:50vh;overflow:auto"></div>
      <button class="btn ghost bloco" id="r-fechar">Fechar</button>`;
    const lista = el.querySelector("#r-lista");
    const desenhar = () => {
      const d = store.dados; // sempre o atual (a nuvem pode ter trocado o objeto)
      const presentes = new Set([...d.checkins.filter(c => c.turmaId === turma.id && c.data === data).map(c => c.alunoId)]);
      const q = normalizar(el.querySelector("#r-busca").value);
      const opcoes = d.alunos.filter(a => a.status === "ativo" && (a.categoria || "adulto") === (turma.categoria || "adulto") && !presentes.has(a.id) && (!q || normalizar(a.nome).includes(q)))
        .sort((x, y) => x.nome.localeCompare(y.nome, "pt-BR")).slice(0, 40);
      lista.innerHTML = opcoes.length ? opcoes.map(a => `<button data-id="${esc(a.id)}" style="text-align:left;width:100%">${pessoa(a)}<span class="link" style="margin-left:auto">Marcar</span></button>`).join("")
        : `<div class="vazio">Ninguém para marcar com essa busca.</div>`;
      lista.querySelectorAll("[data-id]").forEach(b => b.onclick = () => {
        const d = store.dados, a = d.alunos.find(x => x.id === b.dataset.id);
        if (!a) return;
        if (d.checkins.some(c => c.alunoId === a.id && c.turmaId === turma.id && c.data === data)) { toast(`${a.nome.split(" ")[0]} já está presente`); return; }
        d.checkins.push({ id: store.novoId("c"), alunoId: a.id, turmaId: turma.id, data, hora: turma.horario, origem: "manual" });
        store.salvar(); toast(`Presença de ${a.nome.split(" ")[0]} registrada`); desenhar();
      });
    };
    el.querySelector("#r-busca").oninput = desenhar;
    el.querySelector("#r-fechar").onclick = () => { fechar(); aoFechar(); };
    desenhar();
    el.querySelector("#r-busca").focus();
  }, aoFechar);
}

// Rosto que você confirmou na foto (aluno presente ou professor) e que não tinha sido reconhecido de cara:
// vira mais uma referência da pessoa, para a próxima foto da aula reconhecer sozinha.
// Só para quem já autorizou o uso do rosto; o consentimento e a miniatura continuam os mesmos.
function aprenderDaFoto(store, escolhas, rostos) {
  if (store.modo !== "painel" || !escolhas?.length || !rostos) return;
  const profs = new Set(store.dados.professores.map(p => p.id));
  const aprender = escolhas.map((e, i) => ({ e, novo: rostos.rostos[i]?.descritor }))
    .filter(({ e, novo }) => e.alunoId && novo && (e.estado !== "reconhecido" || e.alunoId !== e.sugerido) && (e.marcado || profs.has(e.alunoId)))
    .map(({ e, novo }) => ({ id: e.alunoId, r: store.dados.rostos?.get(e.alunoId), novo }))
    .filter(x => x.r?.consentimento && x.r.descritores?.length);
  if (!aprender.length) return;
  import("../nuvem/dados.js").then(({ salvarRosto }) => Promise.all(aprender.map(({ id, r, novo }) =>
    salvarRosto(id, { descritores: aprenderDescritor(r.descritores, novo), mini: r.mini, consentimento: r.consentimento }))))
    .then(() => toast(`Aprendi ${aprender.length === 1 ? "1 rosto" : `${aprender.length} rostos`} com esta foto`))
    .catch(e => console.error(e));
}

// Presença pela foto. Com alunos reais com rosto cadastrado, reconhece quem é quem (cada rosto
// aparece recortado ao lado do aluno sugerido); o resto segue pela sugestão por frequência.
// O professor sempre confirma antes de gravar.
function abrirAnalise(store, turma, data, foto, pronto) {
  const d = store.dados;
  const cadastrados = cadastradosDe(d);
  const reconhecendo = cadastrados.length > 0;
  let rostos = null, erro = null, pessoas = 0, professorNaFoto = true, marcas = null, escolhas = null;
  const reaisAtivos = d.alunos.filter(a => a.status === "ativo").sort((x, y) => x.nome.localeCompare(y.nome, "pt-BR"));
  // Professor reconhecido aparece com o nome, mas não vira presença nem conta como aluno.
  const idsProf = new Set(d.professores.map(p => p.id)), ehProf = id => !!id && idsProf.has(id);
  const profReconhecido = () => (escolhas || []).some(e => ehProf(e.alunoId));
  abrirFolha((el, fechar) => {
    const jaPresente = id => d.checkins.some(c => c.alunoId === id && c.turmaId === turma.id && c.data === data);
    const desenhar = () => {
      const porRosto = new Set((escolhas || []).filter(e => e.marcado && e.alunoId && !ehProf(e.alunoId)).map(e => e.alunoId));
      const sugestao = sugerirPresenca(d, turma, data, pessoas).filter(x => !porRosto.has(x.aluno.id));
      if (!marcas) marcas = new Map(sugestao.map(x => [x.aluno.id, x.marcado]));
      const novos = sugestao.filter(x => !x.presente && marcas.get(x.aluno.id));
      const novosRosto = (escolhas || []).filter(e => e.marcado && e.alunoId && !ehProf(e.alunoId) && !jaPresente(e.alunoId));
      const total = novos.length + novosRosto.length;
      el.innerHTML = `<h3>Presença pela foto</h3>
        <p class="muted" style="margin:0">${horaTexto(turma.horario)} · ${dataLonga(data)} · ${reconhecendo ? "os rostos cadastrados são reconhecidos" : "a foto mostra quantos; a lista sugere quem"}. Confira antes de confirmar.</p>
        <div class="analise-foto"><span class="af-quadro"><img src="${esc(foto)}" alt="Foto da aula">
          ${rostos ? `<svg class="af-marcas" viewBox="0 0 ${rostos.largura} ${rostos.altura}" preserveAspectRatio="none" aria-hidden="true">${rostos.rostos.map(r =>
            `<rect x="${r.x.toFixed(1)}" y="${r.y.toFixed(1)}" width="${r.w.toFixed(1)}" height="${r.h.toFixed(1)}" rx="${(r.w * 0.12).toFixed(1)}"/>`).join("")}</svg>` : ""}
          ${!rostos && !erro ? `<div class="analise-carregando">${reconhecendo ? "Reconhecendo os rostos…" : "Procurando rostos na foto…"}</div>` : ""}</span></div>
        ${erro ? `<p class="aviso" style="margin:0">Não consegui analisar a foto (${esc(erro)}). Informe abaixo quantos alunos aparecem.</p>`
          : rostos ? `<p style="margin:0"><b>Encontrei ${rostos.rostos.length} rosto${rostos.rostos.length === 1 ? "" : "s"}</b> na foto.</p>` : ""}
        ${escolhas?.length ? `<div class="secao">Reconhecidos na foto</div>
          <div class="lista rec-lista">${escolhas.map((e, i) => `<div class="rec-linha">
            <canvas class="rec-rosto" width="72" height="72" data-i="${i}" aria-hidden="true"></canvas>
            <div class="cresce"><select class="input" data-sel="${i}" aria-label="Quem é o rosto ${i + 1}">
              <option value="">Ninguém / não é aluno</option>
              ${d.professores.length ? `<optgroup label="Professores">${d.professores.map(p => `<option value="${esc(p.id)}"${p.id === e.alunoId ? " selected" : ""}>Prof. ${esc(p.nome)}</option>`).join("")}</optgroup>` : ""}
              <optgroup label="Alunos">${reaisAtivos.map(a => `<option value="${esc(a.id)}"${a.id === e.alunoId ? " selected" : ""}>${esc(a.nome)}</option>`).join("")}</optgroup></select>
              ${e.alunoId && !ehProf(e.alunoId) && jaPresente(e.alunoId) ? '<small class="muted">já estava na lista de presença</small>' : ""}</div>
            <span class="pill ${ehProf(e.alunoId) ? "info" : e.estado === "reconhecido" ? "ok" : e.estado === "duvida" ? "alerta" : ""}">${ehProf(e.alunoId) ? "Professor" : e.estado === "reconhecido" ? "Reconhecido" : e.estado === "duvida" ? "Confira" : "Desconhecido"}</span>
            ${ehProf(e.alunoId) ? '<small class="check muted">não conta presença</small>' : `<label class="check"><input type="checkbox" data-mar="${i}"${e.marcado ? " checked" : ""}${e.alunoId ? "" : " disabled"}> Presente</label>`}</div>`).join("")}</div>
          <div class="secao">Outros alunos (sugestão pela frequência)</div>` : ""}
        <div class="campos">
          <div class="field"><label for="af-n">Alunos na foto${escolhas?.length ? " (sem contar os reconhecidos)" : ""}</label><input class="input" type="number" min="0" max="80" id="af-n" value="${pessoas}"></div>
          ${profReconhecido() ? '<p class="muted" style="align-self:end;margin:0">O professor foi reconhecido na foto e não conta como aluno.</p>'
            : `<label class="check" style="align-self:end"><input type="checkbox" id="af-prof"${professorNaFoto ? " checked" : ""}${rostos ? "" : " disabled"}> O professor está na foto</label>`}
        </div>
        <div class="lista" style="max-height:34vh;overflow:auto">${sugestao.map(x => `<label class="sug${x.presente ? " ja" : ""}">
          <input type="checkbox" data-a="${esc(x.aluno.id)}"${marcas.get(x.aluno.id) ? " checked" : ""}${x.presente ? " disabled" : ""}>
          ${pessoa(x.aluno, x.presente ? "já estava na lista de presença" : x.vezes ? `veio ${x.vezes}× nesta turma nos últimos 3 meses` : x.mesmoDia ? `treina em outra turma deste dia (${x.mesmoDia}×)` : "não costuma vir neste horário")}
          ${x.presente ? '<span class="pill ok">Presente</span>' : ""}</label>`).join("")}</div>
        <div class="acoes"><button class="btn ghost" id="af-x">Cancelar</button><button class="btn" id="af-ok"${total ? "" : " disabled"}>${total ? `Confirmar ${total} presença${total === 1 ? "" : "s"}` : "Nada novo para marcar"}</button></div>`;
      // Recortes dos rostos, desenhados da própria foto (só na tela, nada é guardado).
      if (escolhas?.length) {
        const img = el.querySelector(".af-quadro img");
        const pintar = () => el.querySelectorAll(".rec-rosto").forEach(c => {
          const r = rostos.rostos[Number(c.dataset.i)], q = recorte(r, rostos.largura, rostos.altura), lado = Math.max(q.w, q.h);
          c.getContext("2d").drawImage(img, q.x + (q.w - lado) / 2, q.y + (q.h - lado) / 2, lado, lado, 0, 0, 72, 72);
        });
        if (img.complete) pintar(); else img.addEventListener("load", pintar, { once: true });
      }
      const recalcular = () => {
        pessoas = escolhas ? alunosSemRosto(escolhas, idsProf, professorNaFoto) : Math.max(0, (rostos?.rostos.length || 0) - (professorNaFoto ? 1 : 0));
        marcas = null;
      };
      el.querySelectorAll("[data-sel]").forEach(sel => sel.onchange = () => {
        const i = Number(sel.dataset.sel), id = sel.value;
        // Um aluno só pode estar em um rosto: escolher aqui tira dos outros.
        escolhas.forEach((e, j) => { if (j !== i && id && e.alunoId === id) { e.alunoId = ""; e.marcado = false; } });
        Object.assign(escolhas[i], { alunoId: id, marcado: !!id && !ehProf(id) });
        recalcular(); desenhar();
      });
      el.querySelectorAll("[data-mar]").forEach(c => c.onchange = () => { escolhas[Number(c.dataset.mar)].marcado = c.checked; recalcular(); desenhar(); });
      const n = el.querySelector("#af-n");
      n.onchange = () => { pessoas = Math.max(0, Math.min(80, Math.floor(Number(n.value) || 0))); marcas = null; desenhar(); };
      const prof = el.querySelector("#af-prof");
      if (prof) prof.onchange = e => { professorNaFoto = e.target.checked; recalcular(); desenhar(); };
      el.querySelectorAll("[data-a]").forEach(c => c.onchange = () => { marcas.set(c.dataset.a, c.checked); desenhar(); });
      el.querySelector("#af-x").onclick = () => { fechar(); pronto(); };
      el.querySelector("#af-ok").onclick = async () => {
        el.querySelector("#af-ok").disabled = true;
        const lancar = [...novosRosto.map(e => ({ alunoId: e.alunoId, origem: "rosto" })), ...novos.map(x => ({ alunoId: x.aluno.id, origem: "foto" }))];
        for (const l of lancar) if (!jaPresente(l.alunoId)) d.checkins.push({ id: store.novoId("c"), alunoId: l.alunoId, turmaId: turma.id, data, hora: turma.horario, origem: l.origem });
        const ok = store.salvar() !== false;
        fechar();
        if (ok) toast(`${lancar.length} presença${lancar.length === 1 ? "" : "s"} confirmada${lancar.length === 1 ? "" : "s"} pela foto`);
        if (ok) aprenderDaFoto(store, escolhas, rostos);
        pronto();
      };
    };
    desenhar();
    (reconhecendo ? descreverRostos(foto) : detectarRostos(foto)).then(r => {
      rostos = r;
      if (reconhecendo && r.rostos.length) {
        escolhas = reconhecer(r.rostos.map(x => x.descritor), cadastrados).map(x => ({ ...escolhaInicial(x), estado: x.estado, sugerido: x.alunoId || "" }));
        pessoas = alunosSemRosto(escolhas, idsProf, professorNaFoto);
      } else pessoas = Math.max(0, r.rostos.length - 1);
      marcas = null;
      if (el.isConnected) desenhar();
    }).catch(e => {
      console.error(e);
      erro = /fetch|network|Failed/i.test(String(e?.message)) ? "sem internet para baixar o detector" : "detector indisponível";
      if (el.isConnected) desenhar();
    });
  }, pronto);
}

export default {
  titulo: "Check-ins",
  montar(el, params, ctx) {
    const { store } = ctx, d = store.dados, hoje = hojeISO();
    if (!Array.isArray(d.fotosAula)) d.fotosAula = [];
    if (params[0]) {
      estado.data = params[1] && dataValida(params[1]) && params[1] <= hoje ? params[1] : hoje; estado.turmaId = params[0];
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
        return `<div class="card foto-aula"><div class="card-cab"><div><h3>Foto da aula das ${horaTexto(turma.horario)} ${etiquetaPrograma(turma.programa)}</h3><small>${DIAS_LONGOS[diaSemana(data)]}, ${dataLonga(data)} · ${!guardarFotoDaAula(store.modo, turma) ? "a foto é analisada no aparelho e não é guardada" : f ? `salva por Prof. ${esc(nomeProfessor(d, turma.professorId))}` : "o professor registra como foi a aula"}</small></div>
          ${f ? `<div style="display:flex;gap:8px"><label class="btn sec peq" style="cursor:pointer">Trocar<input type="file" accept="image/*" id="foto-arq" hidden></label><button class="btn sec peq" id="foto-del">Remover</button></div>` : ""}</div>
          ${f ? `<div class="foto-corpo"><button class="foto-grande" id="foto-ver" aria-label="Ver foto da aula em tela cheia"><img src="${esc(f.foto)}" alt="Foto da aula de ${esc(dataLonga(data))}"><span>Ver em tela cheia</span></button>
            <div class="foto-lado"><label for="foto-leg" class="k">Legenda</label>
              <textarea class="input" id="foto-leg" rows="3" maxlength="140" placeholder="Ex.: drill de passagem com a turma toda">${esc(f.legenda || "")}</textarea>
              <small class="muted">${doDia.filter(c => c.turmaId === turma.id).length} alunos presentes nesta aula</small>
              <button class="btn" id="foto-analisar">${icone("checkins")}Analisar foto e marcar presença</button></div></div>`
          : `<label class="foto-vazia">${icone("camera")}<b>Adicionar foto da aula</b><small>Tire na hora ou escolha da galeria · uma foto por aula</small>
              <input type="file" accept="image/*" id="foto-arq" hidden></label>`}</div>`; })() : ""}
      ${turma ? (() => { const temas = temaDaAula(d, turma, data), modelo = (d.modelosAula || []).find(m => m.id === turma.modeloAulaId);
        return temas.length || modelo ? `<div class="card plano-aula">
          ${temas.map(x => `<div class="pa-tema"><span class="k">${esc(x.programa)} · semana ${esc(x.semana)} · Aula ${esc(x.aula)}</span><b>${esc(x.tema)}</b>
            ${x.tecnicas.length ? `<ol class="pa-tecnicas">${x.tecnicas.map(t => `<li>${esc(t.nome)}${t.categoria ? ` <small class="muted">${esc(t.categoria)}</small>` : ""}</li>`).join("")}</ol>` : ""}</div>`).join("")}
          ${modelo ? `<div class="pa-roteiro"><span class="k">Roteiro: ${esc(modelo.nome)}</span><div class="chips">${modelo.blocos.map(b => `<span class="chip">${esc(b.nome)} · ${b.min} min</span>`).join("")}</div></div>` : ""}
        </div>` : ""; })() : ""}
      ${turma ? `<div class="card"><div class="card-cab cab-presenca"><div><h3>${horaTexto(turma.horario)} · ${etiquetaPrograma(turma.programa)}</h3><small>Prof. ${esc(nomeProfessor(d, turma.professorId))} · ${presentes.length} presente${presentes.length === 1 ? "" : "s"}</small></div>
          <button class="btn" id="registrar">${icone("checkins")}Registrar presença</button></div>
        ${presentes.length ? `<table class="tabela resp presentes"><thead><tr><th>Aluno</th><th>Faixa</th><th>Hora</th><th></th></tr></thead><tbody>${presentes.map(c => {
          const a = alunos[c.alunoId];
          return `<tr><td class="pr-nome">${a ? `<a href="#aluno/${encodeURIComponent(a.id)}">${pessoa(a)}</a>` : "Aluno removido"}</td><td class="pr-faixa">${a ? faixaCelula(a) : ""}</td><td class="pr-hora">${horaTexto(c.hora)}</td>
            <td class="num pr-acao"><button class="btn sec peq" data-remover="${esc(c.id)}" aria-label="Remover presença">Remover</button></td></tr>`;
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
      let foto, analise;
      try {
        // Para reconhecer, a foto vai em resolução alta (rostos de longe ficam pequenos); só a cópia guardada é reduzida.
        analise = (await comprimirImagem(arq, 2560, 3_000_000)).dados;
        foto = guardarFotoDaAula(store.modo, turma) ? (await comprimirImagem(arq, 1280, 220 * 1024)).dados : null;
      } catch { toast("Não deu para ler essa imagem"); return; }
      // Modo logado (alunos reais): a foto só é analisada no aparelho e nunca é guardada.
      if (!foto) { abrirAnalise(store, turma, data, analise, ctx.redesenhar); return; }
      const antiga = d.fotosAula.find(x => x.turmaId === turma.id && x.data === data);
      const nova = { id: store.novoId("fa"), turmaId: turma.id, data, foto, legenda: antiga?.legenda || "", professorId: turma.professorId };
      d.fotosAula = d.fotosAula.filter(x => x !== antiga).concat(nova);
      if (!store.salvar()) {
        d.fotosAula = d.fotosAula.filter(x => x !== nova).concat(antiga ? [antiga] : []);
        toast("Sem espaço no navegador para mais fotos. Remova fotos antigas.");
        ctx.redesenhar();
      } else { ctx.redesenhar(); abrirAnalise(store, turma, data, analise, ctx.redesenhar); }
    });
    el.querySelector("#foto-analisar")?.addEventListener("click", () => {
      const f = d.fotosAula.find(x => x.turmaId === turma.id && x.data === data);
      if (f) abrirAnalise(store, turma, data, f.foto, ctx.redesenhar);
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
