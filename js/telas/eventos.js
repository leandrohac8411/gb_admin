// Eventos: graduações, seminários, campeonatos e confraternizações, com lista de inscritos.
import { esc, abrirFolha, perguntar, toast, dataLonga, horaTexto } from "../ui/util.js";
import { normalizar } from "../ui/util-admin.js";
import { hojeISO, dataValida, diasEntre, diaSemana } from "../logica/datas.js";
import { aptidao } from "../logica/graduacao.js";
import { icone } from "../menu.js";
import { cabecalho, pessoa, faixaCelula, porId, DIAS_LONGOS } from "./comum.js";

const TIPOS = ["Graduação", "Seminário", "Campeonato", "Confraternização"];
const PUBLICOS = [["todos", "Todos"], ["adulto", "Adultos"], ["kids", "Kids"]];
const estado = { quando: "Próximos" };
const podeIr = (ev, a) => a.status === "ativo" && (ev.publico === "todos" || (a.categoria || "adulto") === ev.publico);
const pillPublico = p => (p === "kids" ? '<span class="tag kids">Kids</span>' : p === "adulto" ? '<span class="tag">Adultos</span>' : '<span class="tag">Todos</span>');

function formEvento(store, ev, pronto) {
  const x = ev || { titulo: "", tipo: "Graduação", publico: "todos", data: hojeISO(), hora: "10:00", local: "Tatame principal", vagas: 30, descricao: "" };
  const op = (lista, atual) => lista.map(v => Array.isArray(v) ? v : [v, v]).map(([v, t]) => `<option value="${esc(v)}"${v === atual ? " selected" : ""}>${esc(t)}</option>`).join("");
  abrirFolha((el, fechar) => {
    el.innerHTML = `<h3>${ev ? "Editar evento" : "Novo evento"}</h3><form class="campos" novalidate>
      <div class="field cheio"><label for="e-tit">Nome do evento</label><input class="input" id="e-tit" value="${esc(x.titulo)}"></div>
      <div class="field"><label for="e-tipo">Tipo</label><select class="input" id="e-tipo">${op(TIPOS, x.tipo)}</select></div>
      <div class="field"><label for="e-pub">Para quem</label><select class="input" id="e-pub">${op(PUBLICOS, x.publico)}</select></div>
      <div class="field"><label for="e-data">Data</label><input class="input" type="date" id="e-data" value="${esc(x.data)}"></div>
      <div class="field"><label for="e-hora">Hora</label><input class="input" type="time" id="e-hora" value="${esc(x.hora)}"></div>
      <div class="field"><label for="e-local">Local</label><input class="input" id="e-local" value="${esc(x.local)}"></div>
      <div class="field"><label for="e-vagas">Vagas</label><input class="input" type="number" min="1" max="999" step="1" id="e-vagas" value="${esc(x.vagas)}"></div>
      <div class="field cheio"><label for="e-desc">Descrição</label><input class="input" id="e-desc" value="${esc(x.descricao)}"></div>
      <p class="aviso cheio" id="e-erro" hidden></p>
      <div class="acoes cheio"><button type="button" class="btn ghost" id="e-x">Cancelar</button><button class="btn">Salvar</button></div>
      ${ev ? '<button type="button" class="link cheio" id="e-del" style="justify-self:center">Excluir evento</button>' : ""}</form>`;
    const erro = m => { const e = el.querySelector("#e-erro"); e.textContent = m; e.hidden = false; };
    el.querySelector("#e-x").onclick = fechar;
    el.querySelector("#e-del")?.addEventListener("click", async () => {
      fechar();
      if (!await perguntar("Excluir evento?", ev.titulo, "Excluir", "Cancelar")) return;
      store.dados.eventos = store.dados.eventos.filter(y => y !== ev); store.salvar(); toast("Evento excluído"); pronto();
    });
    el.querySelector("form").onsubmit = e => {
      e.preventDefault();
      const titulo = el.querySelector("#e-tit").value.trim(), data = el.querySelector("#e-data").value, hora = el.querySelector("#e-hora").value;
      const vagas = Number(el.querySelector("#e-vagas").value);
      if (titulo.length < 3) return erro("Dê um nome ao evento.");
      if (!dataValida(data)) return erro("Escolha a data.");
      if (!/^\d{2}:\d{2}$/.test(hora)) return erro("Escolha a hora.");
      if (!Number.isInteger(vagas) || vagas < 1) return erro("Informe o número de vagas.");
      if (ev && ev.inscritos.length > vagas) return erro(`Já há ${ev.inscritos.length} inscritos; as vagas não podem ser menos que isso.`);
      const campos = { titulo, tipo: el.querySelector("#e-tipo").value, publico: el.querySelector("#e-pub").value, data, hora,
        local: el.querySelector("#e-local").value.trim(), vagas, descricao: el.querySelector("#e-desc").value.trim() };
      if (ev) {
        Object.assign(ev, campos);
        const alunos = porId(store.dados.alunos);
        ev.inscritos = ev.inscritos.filter(id => alunos[id] && (ev.publico === "todos" || (alunos[id].categoria || "adulto") === ev.publico));
      } else store.dados.eventos.push({ id: store.novoId("ev"), ...campos, inscritos: [] });
      store.salvar(); fechar(); toast("Evento salvo"); pronto();
    };
  });
}

function abrirInscritos(store, ev, pronto) {
  const d = store.dados, hoje = hojeISO();
  abrirFolha((el, fechar) => {
    const desenhar = () => {
      const alunos = porId(d.alunos), q = normalizar(el.querySelector("#i-busca")?.value || "");
      const inscritos = ev.inscritos.map(id => alunos[id]).filter(Boolean).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
      const livres = d.alunos.filter(a => podeIr(ev, a) && !ev.inscritos.includes(a.id) && (!q || normalizar(a.nome).includes(q))).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).slice(0, 30);
      const aptosFora = ev.tipo === "Graduação" ? d.alunos.filter(a => podeIr(ev, a) && !ev.inscritos.includes(a.id) && aptidao(a, d.checkins, hoje).tipo) : [];
      const cheio = ev.inscritos.length >= ev.vagas, passado = ev.data < hoje;
      el.innerHTML = `<h3>${esc(ev.titulo)}</h3><p class="muted" style="margin:0">${dataLonga(ev.data)} · ${horaTexto(ev.hora)} · ${ev.inscritos.length}/${ev.vagas} inscritos</p>
        ${!passado && aptosFora.length && !cheio ? `<button class="btn sec bloco" id="i-aptos">Inscrever os ${aptosFora.length} aptos a graduar</button>` : ""}
        <div class="lista" style="max-height:30vh;overflow:auto">${inscritos.length ? inscritos.map(a => `<div>${pessoa(a)}${faixaCelula(a)}${passado ? "" : `<button class="btn sec peq" data-tirar="${esc(a.id)}" aria-label="Tirar ${esc(a.nome)}">Tirar</button>`}</div>`).join("") : '<div class="vazio">Ninguém inscrito ainda.</div>'}</div>
        ${passado ? "" : `<label class="busca" style="max-width:none">${icone("alunos")}<input id="i-busca" type="search" placeholder="Inscrever aluno" value="${esc(q)}" aria-label="Buscar aluno para inscrever" autocomplete="off"></label>
        <div class="lista" style="max-height:25vh;overflow:auto">${cheio ? '<div class="vazio">Vagas esgotadas.</div>' : livres.map(a => `<button data-pôr="${esc(a.id)}" style="text-align:left;width:100%">${pessoa(a)}<span class="link" style="margin-left:auto">Inscrever</span></button>`).join("") || '<div class="vazio">Ninguém com essa busca.</div>'}</div>`}
        <button class="btn ghost bloco" id="i-x">Fechar</button>`;
      el.querySelector("#i-x").onclick = () => { fechar(); pronto(); };
      const busca = el.querySelector("#i-busca");
      if (busca) { busca.oninput = () => { const pos = busca.selectionStart; desenhar(); const b = el.querySelector("#i-busca"); b.focus(); b.setSelectionRange(pos, pos); }; }
      el.querySelector("#i-aptos")?.addEventListener("click", () => {
        const espaco = ev.vagas - ev.inscritos.length;
        ev.inscritos.push(...aptosFora.slice(0, espaco).map(a => a.id)); store.salvar(); toast("Aptos inscritos"); desenhar();
      });
      el.querySelectorAll("[data-tirar]").forEach(b => b.onclick = () => { ev.inscritos = ev.inscritos.filter(id => id !== b.dataset.tirar); store.salvar(); desenhar(); });
      el.querySelectorAll("[data-pôr]").forEach(b => b.onclick = () => {
        if (ev.inscritos.length >= ev.vagas) { toast("Vagas esgotadas"); return; }
        ev.inscritos.push(b.dataset.pôr); store.salvar(); desenhar();
      });
    };
    desenhar();
  }, pronto);
}

export default {
  titulo: "Eventos",
  montar(el, params, ctx) {
    const { store } = ctx, d = store.dados, hoje = hojeISO();
    const proximos = d.eventos.filter(e => e.data >= hoje).sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
    const passados = d.eventos.filter(e => e.data < hoje).sort((a, b) => b.data.localeCompare(a.data));
    const lista = estado.quando === "Próximos" ? proximos : passados;
    const prox = proximos[0];
    el.innerHTML = cabecalho("Eventos", "Graduações, seminários, campeonatos e confraternizações.", `<button class="btn" id="novo">${icone("eventos")}Novo evento</button>`) +
      (prox ? `<div class="card destaque-evento"><div><span class="k" style="color:rgba(255,255,255,.8)">Próximo evento · ${diasEntre(hoje, prox.data) === 0 ? "hoje" : `em ${diasEntre(hoje, prox.data)} dia${diasEntre(hoje, prox.data) === 1 ? "" : "s"}`}</span>
          <h2>${esc(prox.titulo)}</h2><p>${DIAS_LONGOS[diaSemana(prox.data)]}, ${dataLonga(prox.data)} · ${horaTexto(prox.hora)} · ${esc(prox.local)}</p></div>
          <div class="ev-num"><b>${prox.inscritos.length}</b><small>de ${prox.vagas} vagas</small></div></div>` : "") +
      `<div class="chips">${["Próximos", "Passados"].map(t => `<button class="chip${estado.quando === t ? " on" : ""}" data-q="${t}">${t} · ${t === "Próximos" ? proximos.length : passados.length}</button>`).join("")}</div>
      ${lista.length ? `<div class="grade3">${lista.map(e => `<div class="card evento">
          <div class="ev-data"><b>${e.data.slice(8)}</b><small>${["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"][Number(e.data.slice(5, 7)) - 1]}</small></div>
          <div class="ev-info"><div style="display:flex;gap:6px;flex-wrap:wrap"><span class="pill info">${esc(e.tipo)}</span>${pillPublico(e.publico)}</div>
            <h3>${esc(e.titulo)}</h3><small class="muted">${horaTexto(e.hora)} · ${esc(e.local)}</small>
            ${e.descricao ? `<p class="muted" style="margin:6px 0 0;font-size:12.5px">${esc(e.descricao)}</p>` : ""}
            <div class="progresso" style="margin-top:10px"><i style="width:${Math.min(100, Math.round(e.inscritos.length / e.vagas * 100))}%"></i></div>
            <small class="muted">${e.inscritos.length} de ${e.vagas} vagas${e.inscritos.length >= e.vagas ? " · esgotado" : ""}</small>
            <div style="display:flex;gap:8px;margin-top:10px"><button class="btn peq" data-inscritos="${esc(e.id)}">${e.data < hoje ? "Ver participantes" : "Inscritos"}</button><button class="btn sec peq" data-editar="${esc(e.id)}">Editar</button></div>
          </div></div>`).join("")}</div>` : `<div class="card vazio">${estado.quando === "Próximos" ? "Nenhum evento marcado." : "Nenhum evento passado."}</div>`}`;
    el.querySelectorAll("[data-q]").forEach(b => b.onclick = () => { estado.quando = b.dataset.q; ctx.redesenhar(); });
    el.querySelector("#novo").onclick = () => formEvento(store, null, ctx.redesenhar);
    el.querySelectorAll("[data-editar]").forEach(b => b.onclick = () => formEvento(store, d.eventos.find(e => e.id === b.dataset.editar), ctx.redesenhar));
    el.querySelectorAll("[data-inscritos]").forEach(b => b.onclick = () => abrirInscritos(store, d.eventos.find(e => e.id === b.dataset.inscritos), ctx.redesenhar));
  }
};
