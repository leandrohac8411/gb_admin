// Página de um evento (#evento/<id>): tudo sobre ele numa tela só, com relatório para imprimir.
// Graduação: quem troca de faixa, quem pega grau e quem ainda não está apto; confirma no dia.
// Campeonato: categoria de cada inscrito e, depois, a medalha (aparece na ficha do aluno).
// Confraternização: acompanhantes, valor por pessoa e quem já pagou. Seminário: presença no dia.
import { esc, toast, dataLonga, horaTexto, perguntar } from "../ui/util.js";
import { normalizar, reais } from "../ui/util-admin.js";
import { hojeISO, diasEntre, diaSemana } from "../logica/datas.js";
import { aptidao } from "../logica/graduacao.js";
import { nomeFaixa } from "../ui/faixa.js";
import { icone } from "../menu.js";
import { cabecalho, pessoa, faixaCelula, porId, DIAS_LONGOS } from "./comum.js";
import { formEvento, podeIr, pillPublico } from "./eventos.js";
import {
  detalhe, gruposGraduacao, aplicarGraduacoes, categoriaSugerida, categoriaDe, MEDALHAS, EMOJI_MEDALHA,
  quadroMedalhas, gruposCampeonato, resumoConfra
} from "../logica/eventos.js";

const estado = { busca: "", eventoId: null };
const grauTexto = n => (n ? `${n}º grau` : "sem grau");
const kpi = (rotulo, valor, sub = "") => `<div class="kpi"><div class="kpi-top"><span>${rotulo}</span></div><b>${valor}</b><small>${sub}</small></div>`;
const vazio = t => `<div class="vazio">${t}</div>`;

// ---------- Conteúdo por tipo ----------
function secaoGraduacao(ev, d, hoje) {
  const g = gruposGraduacao(ev, d.alunos, d.checkins, hoje), liberado = ev.data <= hoje;
  const linha = (x, tipo, de, para, marcado) => `<tr><td class="cheia">${pessoa(x.aluno)}</td><td>${de}</td><td><b>${para}</b></td>
    <td class="num">${tipo ? `<label class="check"><input type="checkbox" data-grad="${esc(x.aluno.id)}" data-tipo="${tipo}"${x.proxima ? ` data-proxima="${esc(x.proxima)}"` : ""}${marcado ? " checked" : ""}${liberado ? "" : " disabled"}> Graduar</label>` : ""}</td></tr>`;
  const tabela = (titulo, sub, lista, montar) => `<div class="card"><div class="card-cab"><div><h3>${titulo}</h3><small>${sub}</small></div><span class="contador">${lista.length}</span></div>
    ${lista.length ? `<table class="tabela resp"><thead><tr><th>Aluno</th><th>Hoje</th><th>Vai para</th><th></th></tr></thead><tbody>${lista.map(montar).join("")}</tbody></table>` : vazio("Ninguém neste grupo.")}</div>`;
  const pendentes = g.faixa.length + g.grau.length + g.naoAptos.filter(x => (Number(x.aluno.graus) || 0) < 4).length;
  return `<div class="ev-secoes">
    ${tabela("Troca de faixa", "Pegam a faixa nova", g.faixa, x => linha(x, "faixa", faixaCelula(x.aluno), nomeFaixa(x.proxima), true))}
    ${tabela("Grau", "Continuam na faixa e pegam mais um grau", g.grau, x => linha(x, "grau", faixaCelula(x.aluno), `${nomeFaixa(x.aluno.faixa)} · ${grauTexto(x.proximoGrau)}`, true))}
    ${tabela("Ainda não aptos", "Pelas regras da academia; o professor decide", g.naoAptos, x => linha(x, (Number(x.aluno.graus) || 0) < 4 ? "grau" : "", faixaCelula(x.aluno), x.faltamAulas ? `faltam ${x.faltamAulas} aulas` : "aguardando o tempo", false))}
    ${g.graduados.length ? tabela("Graduados neste evento", "Já confirmados", g.graduados, x => `<tr><td class="cheia">${pessoa(x.aluno)}</td><td>${x.tipo === "faixa" ? "Faixa nova" : "Grau"}</td><td><b>${nomeFaixa(x.faixa)} · ${grauTexto(x.graus)}</b></td><td class="num"><span class="pill ok">Graduado</span></td></tr>`) : ""}
    ${pendentes ? `<div class="ev-confirmar">${liberado ? `<button class="btn" id="ev-graduar">Confirmar graduações marcadas</button><small class="muted">Muda a faixa ou o grau na ficha de cada um e grava no histórico.</small>` : `<small class="muted">A confirmação libera no dia do evento (${esc(dataLonga(ev.data))}).</small>`}</div>` : ""}
  </div>`;
}

function secaoCampeonato(ev, d, hoje, alunos) {
  const depois = ev.data <= hoje, q = quadroMedalhas(ev);
  const grupos = gruposCampeonato(ev, alunos, hoje);
  return `<div class="ev-secoes">
    ${depois ? `<div class="card ev-quadro">${["ouro", "prata", "bronze"].map(m => `<div><span>${EMOJI_MEDALHA[m]}</span><b>${q[m]}</b><small>${MEDALHAS[m]}</small></div>`).join("")}</div>` : ""}
    ${grupos.length ? grupos.map(gr => `<div class="card"><div class="card-cab"><h3>${esc(gr.titulo)}</h3><span class="contador">${gr.atletas.length}</span></div>
      <table class="tabela resp"><thead><tr><th>Atleta</th><th>Categoria</th><th>${depois ? "Resultado" : ""}</th></tr></thead><tbody>${gr.atletas.map(({ aluno: a }) => {
        const x = ev.detalhes?.[a.id] || {};
        return `<tr><td class="cheia">${pessoa(a, nomeFaixa(a.faixa))}</td>
          <td><input class="input ev-cat" data-cat="${esc(a.id)}" value="${esc(x.categoria || "")}" placeholder="${esc(categoriaSugerida(a, hoje))}" aria-label="Categoria de ${esc(a.nome)}"></td>
          <td>${depois ? `<select class="input" data-medalha="${esc(a.id)}" aria-label="Resultado de ${esc(a.nome)}"><option value="">—</option>${Object.entries(MEDALHAS).map(([k, t]) => `<option value="${k}"${x.medalha === k ? " selected" : ""}>${EMOJI_MEDALHA[k]} ${t}</option>`).join("")}</select>` : ""}</td></tr>`;
      }).join("")}</tbody></table></div>`).join("") : `<div class="card">${vazio("Ninguém inscrito ainda.")}</div>`}
    <p class="muted" style="margin:0;font-size:12.5px">A categoria vem do cadastro (faixa, idade e peso). Para mudar, escreva no campo. ${depois ? "As medalhas aparecem na ficha de cada aluno." : "Depois do campeonato, aqui aparece o resultado de cada um."}</p>
  </div>`;
}

function secaoConfra(ev, alunos) {
  const r = resumoConfra(ev), lista = (ev.inscritos || []).map(id => alunos[id]).filter(Boolean).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  return `<div class="ev-secoes"><div class="card">
    <div class="card-cab"><h3>Participantes</h3><label class="ev-valor">Valor por pessoa (R$) <input class="input" type="number" min="0" step="0.01" inputmode="decimal" id="ev-valor" value="${esc(ev.valorPessoa ?? "")}" placeholder="0,00"></label></div>
    ${lista.length ? `<table class="tabela resp"><thead><tr><th>Nome</th><th>Acompanhantes</th><th>Pagamento</th></tr></thead><tbody>${lista.map(a => {
      const x = ev.detalhes?.[a.id] || {};
      return `<tr><td class="cheia">${pessoa(a)}</td><td><input class="input ev-num" type="number" min="0" max="20" step="1" data-acomp="${esc(a.id)}" value="${Number(x.acompanhantes) || 0}" aria-label="Acompanhantes de ${esc(a.nome)}"></td>
        <td><label class="check"><input type="checkbox" data-pago="${esc(a.id)}"${x.pago ? " checked" : ""}> Pago</label></td></tr>`;
    }).join("")}</tbody></table>` : vazio("Ninguém inscrito ainda.")}</div>
    <p class="muted" style="margin:0;font-size:12.5px">${r.pessoas} pessoa${r.pessoas === 1 ? "" : "s"} contando acompanhantes · ${r.pagos} de ${lista.length} pagos${Number(ev.valorPessoa) ? ` · recebido ${reais(r.recebido)} · falta ${reais(r.falta)}` : ""}</p></div>`;
}

function secaoSeminario(ev, alunos, hoje) {
  const lista = (ev.inscritos || []).map(id => alunos[id]).filter(Boolean).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  return `<div class="ev-secoes"><div class="card"><div class="card-cab"><h3>Participantes</h3><small>${lista.filter(a => ev.detalhes?.[a.id]?.presente).length} presentes</small></div>
    ${lista.length ? `<table class="tabela resp"><thead><tr><th>Aluno</th><th>Faixa</th><th>${ev.data <= hoje ? "Presença" : ""}</th></tr></thead><tbody>${lista.map(a => `<tr><td class="cheia">${pessoa(a)}</td><td>${faixaCelula(a)}</td>
      <td>${ev.data <= hoje ? `<label class="check"><input type="checkbox" data-presente="${esc(a.id)}"${ev.detalhes?.[a.id]?.presente ? " checked" : ""}> Veio</label>` : ""}</td></tr>`).join("")}</tbody></table>` : vazio("Ninguém inscrito ainda.")}</div></div>`;
}

// ---------- Inscrições ----------
function secaoInscricoes(ev, d, hoje, alunos) {
  const passado = ev.data < hoje, cheio = ev.inscritos.length >= ev.vagas, q = normalizar(estado.busca);
  const inscritos = ev.inscritos.map(id => alunos[id]).filter(Boolean).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const livres = d.alunos.filter(a => podeIr(ev, a) && !ev.inscritos.includes(a.id) && (!q || normalizar(a.nome).includes(q))).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).slice(0, 30);
  const aptosFora = ev.tipo === "Graduação" ? d.alunos.filter(a => podeIr(ev, a) && !ev.inscritos.includes(a.id) && aptidao(a, d.checkins, hoje).tipo) : [];
  const espaco = ev.vagas - ev.inscritos.length;
  return `<aside class="card ev-inscricoes"><div class="card-cab"><h3>Inscritos</h3><span class="contador">${ev.inscritos.length}/${Number(ev.vagas)}</span></div>
    ${!passado && aptosFora.length && !cheio ? `<button class="btn sec bloco" id="ev-aptos">Inscrever ${Math.min(aptosFora.length, espaco)} apto${Math.min(aptosFora.length, espaco) === 1 ? "" : "s"} a graduar${aptosFora.length > espaco ? ` (de ${aptosFora.length}; faltam vagas)` : ""}</button>` : ""}
    <div class="lista ev-rolagem">${inscritos.length ? inscritos.map(a => `<div>${pessoa(a)}${passado ? "" : `<button class="btn sec peq" data-tirar="${esc(a.id)}" aria-label="Tirar ${esc(a.nome)}">Tirar</button>`}</div>`).join("") : vazio("Ninguém inscrito ainda.")}</div>
    ${passado ? "" : `<label class="busca" style="max-width:none">${icone("alunos")}<input id="ev-busca" type="search" placeholder="Inscrever aluno" value="${esc(estado.busca)}" aria-label="Buscar aluno para inscrever" autocomplete="off"></label>
    <div class="lista ev-rolagem">${cheio ? vazio("Vagas esgotadas.") : livres.map(a => `<button data-por="${esc(a.id)}" style="text-align:left;width:100%">${pessoa(a)}<span class="link" style="margin-left:auto">Inscrever</span></button>`).join("") || vazio("Ninguém com essa busca.")}</div>`}
  </aside>`;
}

// ---------- Relatório para imprimir ----------
function relatorio(ev, d, hoje, alunos) {
  const caixa = '<span class="rel-caixa"></span>';
  const tabela = (titulo, cab, linhas) => `<h3>${titulo} <small>(${linhas.length})</small></h3>${linhas.length ? `<table><thead><tr><th>#</th>${cab.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>${linhas.map((l, i) => `<tr><td>${i + 1}</td>${l.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>` : "<p>Ninguém.</p>"}`;
  const faixaTxt = a => `${nomeFaixa(a.faixa)}${a.graus ? ` · ${a.graus}º grau` : ""}`;
  let corpo = "";
  if (ev.tipo === "Graduação") {
    const g = gruposGraduacao(ev, d.alunos, d.checkins, hoje);
    corpo = tabela("Troca de faixa", ["Nome", "Faixa atual", "Faixa nova", "Entregue"], g.faixa.map(x => [esc(x.aluno.nome), faixaTxt(x.aluno), nomeFaixa(x.proxima), caixa]))
      + tabela("Grau", ["Nome", "Faixa", "Grau novo", "Entregue"], g.grau.map(x => [esc(x.aluno.nome), faixaTxt(x.aluno), grauTexto(x.proximoGrau), caixa]))
      + (g.naoAptos.length ? tabela("Inscritos ainda não aptos", ["Nome", "Faixa", "Observação"], g.naoAptos.map(x => [esc(x.aluno.nome), faixaTxt(x.aluno), x.faltamAulas ? `faltam ${x.faltamAulas} aulas` : "aguardando o tempo"])) : "")
      + (g.graduados.length ? tabela("Graduados", ["Nome", "Recebeu"], g.graduados.map(x => [esc(x.aluno.nome), `${nomeFaixa(x.faixa)} · ${grauTexto(x.graus)}`])) : "");
  } else if (ev.tipo === "Campeonato") {
    const depois = ev.data <= hoje, q = quadroMedalhas(ev);
    corpo = (depois ? `<p class="rel-quadro">🥇 ${q.ouro} ouro · 🥈 ${q.prata} prata · 🥉 ${q.bronze} bronze</p>` : "")
      + gruposCampeonato(ev, alunos, hoje).map(gr => tabela(esc(gr.titulo), ["Atleta", "Categoria", depois ? "Resultado" : "Presente"],
        gr.atletas.map(({ aluno: a, categoria }) => [esc(a.nome), esc(categoria), depois ? (MEDALHAS[ev.detalhes?.[a.id]?.medalha] || "—") : caixa]))).join("");
  } else if (ev.tipo === "Confraternização") {
    const r = resumoConfra(ev), lista = ev.inscritos.map(id => alunos[id]).filter(Boolean).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    corpo = `<p class="rel-quadro">${r.pessoas} pessoas (com acompanhantes) · ${r.pagos} de ${lista.length} pagos${Number(ev.valorPessoa) ? ` · ${reais(Number(ev.valorPessoa))} por pessoa · recebido ${reais(r.recebido)} · falta ${reais(r.falta)}` : ""}</p>`
      + tabela("Lista de entrada", ["Nome", "Acompanhantes", "Pago", "Chegou"], lista.map(a => { const x = ev.detalhes?.[a.id] || {}; return [esc(a.nome), Number(x.acompanhantes) || 0, x.pago ? "Sim" : "Não", caixa]; }));
  } else {
    corpo = tabela("Lista de presença", ["Nome", "Faixa", "Assinatura"], ev.inscritos.map(id => alunos[id]).filter(Boolean).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map(a => [esc(a.nome), faixaTxt(a), '<span class="rel-linha"></span>']));
  }
  return `<div class="relatorio" aria-hidden="true">
    <header><b>${esc(d.config?.academia?.nome || "Academia")}</b><h2>${esc(ev.titulo)}</h2>
      <p>${esc(ev.tipo)} · ${DIAS_LONGOS[diaSemana(ev.data)]}, ${esc(dataLonga(ev.data))} · ${esc(horaTexto(ev.hora))} · ${esc(ev.local || "")}</p>
      <small>${ev.inscritos.length} inscritos · emitido em ${esc(dataLonga(hoje))}</small></header>${corpo}</div>`;
}

// ---------- Tela ----------
export default {
  titulo: "Evento",
  montar(el, params, ctx) {
    const { store } = ctx, d = store.dados, hoje = hojeISO();
    const ev = d.eventos.find(e => e.id === params[0]);
    if (!ev) {
      el.innerHTML = cabecalho("Evento") + `<div class="card vazio">Esse evento não existe mais. <a class="link" href="#eventos">Voltar para Eventos</a></div>`;
      return;
    }
    if (estado.eventoId !== ev.id) { estado.eventoId = ev.id; estado.busca = ""; }
    const alunos = porId(d.alunos);
    ev.inscritos = (ev.inscritos || []).filter(id => alunos[id]);
    const dias = diasEntre(hoje, ev.data);
    const quando = dias === 0 ? "hoje" : dias > 0 ? `em ${dias} dia${dias === 1 ? "" : "s"}` : `há ${-dias} dia${dias === -1 ? "" : "s"}`;
    let kpis = kpi("Inscritos", `${ev.inscritos.length}<small>/${Number(ev.vagas)}</small>`, ev.inscritos.length >= ev.vagas ? "vagas esgotadas" : `${ev.vagas - ev.inscritos.length} vagas livres`) + kpi("Quando", quando, `${DIAS_LONGOS[diaSemana(ev.data)]}, ${dataLonga(ev.data)}`);
    let secao;
    if (ev.tipo === "Graduação") {
      const g = gruposGraduacao(ev, d.alunos, d.checkins, hoje);
      kpis += kpi("Troca de faixa", g.faixa.length, "aptos inscritos") + kpi("Grau", g.grau.length, `${g.graduados.length} já graduados`);
      secao = secaoGraduacao(ev, d, hoje);
    } else if (ev.tipo === "Campeonato") {
      const q = quadroMedalhas(ev);
      kpis += kpi("Categorias", new Set(gruposCampeonato(ev, alunos, hoje).flatMap(g => g.atletas.map(x => x.categoria))).size, "pela faixa, idade e peso") + kpi("Medalhas", q.ouro + q.prata + q.bronze, `🥇 ${q.ouro} · 🥈 ${q.prata} · 🥉 ${q.bronze}`);
      secao = secaoCampeonato(ev, d, hoje, alunos);
    } else if (ev.tipo === "Confraternização") {
      const r = resumoConfra(ev);
      kpis += kpi("Pessoas", r.pessoas, "com acompanhantes") + kpi("Recebido", reais(r.recebido), Number(ev.valorPessoa) ? `falta ${reais(r.falta)}` : "sem valor definido");
      secao = secaoConfra(ev, alunos);
    } else secao = secaoSeminario(ev, alunos, hoje);

    el.innerHTML = cabecalho(ev.titulo, `${esc(ev.tipo)} · ${esc(horaTexto(ev.hora))} · ${esc(ev.local || "")}`,
      `<a class="btn ghost" href="#eventos">← Eventos</a><button class="btn sec" id="ev-editar">Editar</button><button class="btn" id="ev-imprimir">${icone("documentos")}Imprimir relatório</button>`) +
      `<div class="ev-pagina">
        <div style="display:flex;gap:6px;flex-wrap:wrap"><span class="pill info">${esc(ev.tipo)}</span>${pillPublico(ev.publico)}</div>
        ${ev.descricao ? `<p class="muted" style="margin:0">${esc(ev.descricao)}</p>` : ""}
        <div class="kpis">${kpis}</div>
        <div class="ev-corpo"><div>${secao}</div>${secaoInscricoes(ev, d, hoje, alunos)}</div>
      </div>${relatorio(ev, d, hoje, alunos)}`;

    const salvar = (msg, redesenhar = true) => { store.salvar(); if (msg) toast(msg); if (redesenhar) ctx.redesenhar(); };
    el.querySelector("#ev-editar").onclick = () => formEvento(store, ev, () => (d.eventos.includes(ev) ? ctx.redesenhar() : ctx.ir("eventos")));
    el.querySelector("#ev-imprimir").onclick = () => window.print();

    // Inscrições
    const busca = el.querySelector("#ev-busca");
    if (busca) busca.oninput = () => { estado.busca = busca.value; const pos = busca.selectionStart; ctx.redesenhar(); const b = document.querySelector("#ev-busca"); b?.focus(); b?.setSelectionRange(pos, pos); };
    el.querySelector("#ev-aptos")?.addEventListener("click", () => {
      const espaco = ev.vagas - ev.inscritos.length;
      const aptos = d.alunos.filter(a => podeIr(ev, a) && !ev.inscritos.includes(a.id) && aptidao(a, d.checkins, hoje).tipo);
      ev.inscritos.push(...aptos.slice(0, espaco).map(a => a.id)); salvar("Aptos inscritos");
    });
    el.querySelectorAll("[data-tirar]").forEach(b => b.onclick = async () => {
      const id = b.dataset.tirar, x = ev.detalhes?.[id];
      if ((x?.medalha || x?.pago) && !await perguntar("Tirar da lista?", `${alunos[id]?.nome} tem ${x.medalha ? "medalha" : "pagamento"} registrado neste evento. Isso se perde.`, "Tirar", "Cancelar")) return;
      ev.inscritos = ev.inscritos.filter(i => i !== id);
      if (ev.detalhes) delete ev.detalhes[id];
      salvar();
    });
    el.querySelectorAll("[data-por]").forEach(b => b.onclick = () => {
      if (ev.inscritos.length >= ev.vagas) { toast("Vagas esgotadas"); return; }
      ev.inscritos.push(b.dataset.por); estado.busca = ""; salvar();
    });

    // Graduação
    el.querySelector("#ev-graduar")?.addEventListener("click", async () => {
      const escolhas = [...el.querySelectorAll("[data-grad]:checked")].map(c => ({ id: c.dataset.grad, tipo: c.dataset.tipo, proxima: c.dataset.proxima }));
      if (!escolhas.length) { toast("Marque quem vai graduar"); return; }
      const faixas = escolhas.filter(e => e.tipo === "faixa").length, graus = escolhas.length - faixas;
      if (!await perguntar("Confirmar graduações?", `${faixas} troca${faixas === 1 ? "" : "s"} de faixa e ${graus} grau${graus === 1 ? "" : "s"}. A ficha de cada aluno muda e entra no histórico.`, "Graduar", "Cancelar")) return;
      const n = aplicarGraduacoes(d, ev, escolhas, hoje);
      salvar(`${n} graduaç${n === 1 ? "ão confirmada" : "ões confirmadas"} 🥋`);
    });

    // Campeonato
    el.querySelectorAll("[data-cat]").forEach(i => i.onchange = () => { detalhe(ev, i.dataset.cat).categoria = i.value.trim().slice(0, 80); salvar("", true); });
    el.querySelectorAll("[data-medalha]").forEach(s => s.onchange = () => {
      const x = detalhe(ev, s.dataset.medalha);
      if (s.value in MEDALHAS) x.medalha = s.value; else delete x.medalha;
      // Guarda a categoria do dia junto da medalha (a sugestão muda com o tempo: idade e peso).
      if (!x.categoria && alunos[s.dataset.medalha]) x.categoria = categoriaDe(ev, alunos[s.dataset.medalha], ev.data);
      salvar(s.value && s.value !== "participou" ? `${MEDALHAS[s.value]} registrada` : "");
    });

    // Confraternização
    el.querySelector("#ev-valor")?.addEventListener("change", e => {
      const v = Number(e.target.value);
      if (e.target.value === "" || (Number.isFinite(v) && v >= 0 && v <= 100000)) { if (e.target.value === "") delete ev.valorPessoa; else ev.valorPessoa = Math.round(v * 100) / 100; salvar(); }
      else toast("Valor inválido");
    });
    el.querySelectorAll("[data-acomp]").forEach(i => i.onchange = () => { detalhe(ev, i.dataset.acomp).acompanhantes = Math.max(0, Math.min(20, Math.floor(Number(i.value) || 0))); salvar(); });
    el.querySelectorAll("[data-pago]").forEach(c => c.onchange = () => { detalhe(ev, c.dataset.pago).pago = c.checked; salvar(); });

    // Seminário
    el.querySelectorAll("[data-presente]").forEach(c => c.onchange = () => { detalhe(ev, c.dataset.presente).presente = c.checked; salvar(); });
  }
};
