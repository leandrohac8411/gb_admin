// Eventos: graduações, seminários, campeonatos e confraternizações, com lista de inscritos.
import { esc, abrirFolha, perguntar, toast, dataLonga, horaTexto } from "../ui/util.js";
import { hojeISO, dataValida, diasEntre, diaSemana } from "../logica/datas.js";
import { temMedalhas } from "../logica/eventos.js";
import { icone } from "../menu.js";
import { cabecalho, pessoa, faixaCelula, porId, DIAS_LONGOS } from "./comum.js";
import { inscritosDoPublico } from "../logica/regras-cadastro.js";

const TIPOS = ["Graduação", "Seminário", "Campeonato", "Confraternização"];
const PUBLICOS = [["todos", "Todos"], ["adulto", "Adultos"], ["kids", "Kids"]];
const estado = { quando: "Próximos" };
export const podeIr = (ev, a) => a.status === "ativo" && (ev.publico === "todos" || (a.categoria || "adulto") === ev.publico);
export const pillPublico = p => (p === "kids" ? '<span class="tag kids">Kids</span>' : p === "adulto" ? '<span class="tag">Adultos</span>' : '<span class="tag">Todos</span>');

export function formEvento(store, ev, pronto) {
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
      const perde = [temMedalhas(ev) ? "as medalhas (somem da ficha dos alunos)" : "", ev.tipo === "Confraternização" && Object.values(ev.detalhes || {}).some(x => x.pago) ? "os pagamentos marcados" : ""].filter(Boolean);
      if (!await perguntar("Excluir evento?", `${ev.titulo}${perde.length ? `. Junto com ele vão ${perde.join(" e ")}.` : ""}${ev.graduados?.length ? " As graduações já confirmadas continuam na ficha." : ""}`, "Excluir", "Cancelar")) return;
      store.dados.eventos = store.dados.eventos.filter(y => y !== ev); store.salvar(); toast("Evento excluído"); pronto();
    });
    el.querySelector("form").onsubmit = e => {
      e.preventDefault();
      const titulo = el.querySelector("#e-tit").value.trim(), data = el.querySelector("#e-data").value, hora = el.querySelector("#e-hora").value;
      const vagas = Number(el.querySelector("#e-vagas").value);
      let aviso = "Evento salvo";
      if (titulo.length < 3) return erro("Dê um nome ao evento.");
      if (!dataValida(data)) return erro("Escolha a data.");
      if (!/^\d{2}:\d{2}$/.test(hora)) return erro("Escolha a hora.");
      if (!Number.isInteger(vagas) || vagas < 1 || vagas > 10000) return erro("Informe o número de vagas (1 a 10.000).");
      const campos = { titulo, tipo: el.querySelector("#e-tipo").value, publico: el.querySelector("#e-pub").value, data, hora,
        local: el.querySelector("#e-local").value.trim(), vagas, descricao: el.querySelector("#e-desc").value.trim() };
      if (ev) {
        const alunos = porId(store.dados.alunos);
        const { ficam, saem } = inscritosDoPublico(ev.inscritos, campos.publico, alunos);
        if (ficam.length > vagas) return erro(`Já há ${ficam.length} inscritos; as vagas não podem ser menos que isso.`);
        Object.assign(ev, campos, { inscritos: ficam });
        // Mudou o público: avisa quem saiu da lista, para ninguém sumir sem explicação.
        if (saem.length) aviso = `Evento salvo. ${saem.length} inscrito${saem.length === 1 ? " saiu" : "s saíram"} da lista por não ser${saem.length === 1 ? "" : "em"} do público novo.`;
      } else store.dados.eventos.push({ id: store.novoId("ev"), ...campos, inscritos: [] });
      store.salvar(); fechar(); toast(aviso); pronto();
    };
  });
}

export default {
  titulo: "Eventos",
  montar(el, params, ctx) {
    const { store } = ctx, d = store.dados, hoje = hojeISO();
    const existe = new Set(d.alunos.map(a => a.id));
    d.eventos.forEach(ev => { ev.inscritos = (ev.inscritos || []).filter(id => existe.has(id)); });
    const proximos = d.eventos.filter(e => e.data >= hoje).sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
    const passados = d.eventos.filter(e => e.data < hoje).sort((a, b) => b.data.localeCompare(a.data));
    const lista = estado.quando === "Próximos" ? proximos : passados;
    const prox = proximos[0];
    el.innerHTML = cabecalho("Eventos", "Graduações, seminários, campeonatos e confraternizações.", `<button class="btn" id="novo">${icone("eventos")}Novo evento</button>`) +
      (prox ? `<div class="card destaque-evento"><div><span class="k" style="color:rgba(255,255,255,.8)">Próximo evento · ${diasEntre(hoje, prox.data) === 0 ? "hoje" : `em ${diasEntre(hoje, prox.data)} dia${diasEntre(hoje, prox.data) === 1 ? "" : "s"}`}</span>
          <h2>${esc(prox.titulo)}</h2><p>${DIAS_LONGOS[diaSemana(prox.data)]}, ${esc(dataLonga(prox.data))} · ${esc(horaTexto(prox.hora))} · ${esc(prox.local)}</p></div>
          <div class="ev-num"><b>${prox.inscritos.length}</b><small>de ${Number(prox.vagas)} vagas</small></div></div>` : "") +
      `<div class="chips">${["Próximos", "Passados"].map(t => `<button class="chip${estado.quando === t ? " on" : ""}" data-q="${t}">${t} · ${t === "Próximos" ? proximos.length : passados.length}</button>`).join("")}</div>
      ${lista.length ? `<div class="grade3">${lista.map(e => `<div class="card evento">
          <div class="ev-data"><b>${esc(e.data.slice(8))}</b><small>${["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"][Number(e.data.slice(5, 7)) - 1]}</small></div>
          <div class="ev-info"><div style="display:flex;gap:6px;flex-wrap:wrap"><span class="pill info">${esc(e.tipo)}</span>${pillPublico(e.publico)}</div>
            <h3>${esc(e.titulo)}</h3><small class="muted">${esc(horaTexto(e.hora))} · ${esc(e.local)}</small>
            ${e.descricao ? `<p class="muted" style="margin:6px 0 0;font-size:12.5px">${esc(e.descricao)}</p>` : ""}
            <div class="progresso" style="margin-top:10px"><i style="width:${Math.min(100, Math.round(e.inscritos.length / e.vagas * 100))}%"></i></div>
            <small class="muted">${e.inscritos.length} de ${Number(e.vagas)} vagas${e.inscritos.length >= e.vagas ? " · esgotado" : ""}</small>
            <div style="display:flex;gap:8px;margin-top:10px"><a class="btn peq" href="#evento/${encodeURIComponent(e.id)}">${e.data < hoje ? "Ver resultado" : "Abrir evento"}</a><button class="btn sec peq" data-editar="${esc(e.id)}">Editar</button></div>
          </div></div>`).join("")}</div>` : `<div class="card vazio">${estado.quando === "Próximos" ? "Nenhum evento marcado." : "Nenhum evento passado."}</div>`}`;
    el.querySelectorAll("[data-q]").forEach(b => b.onclick = () => { estado.quando = b.dataset.q; ctx.redesenhar(); });
    el.querySelector("#novo").onclick = () => formEvento(store, null, ctx.redesenhar);
    el.querySelectorAll("[data-editar]").forEach(b => b.onclick = () => formEvento(store, d.eventos.find(e => e.id === b.dataset.editar), ctx.redesenhar));
    // O cartão inteiro abre a página do evento (menos o botão Editar).
    el.querySelectorAll(".card.evento").forEach(c => { c.classList.add("clica"); c.onclick = e => { if (!e.target.closest("button, a")) location.hash = c.querySelector("a[href^='#evento/']").getAttribute("href"); }; });
    if (prox) { const dest = el.querySelector(".destaque-evento"); dest.classList.add("clica"); dest.onclick = () => { location.hash = `#evento/${encodeURIComponent(prox.id)}`; }; }
  }
};
