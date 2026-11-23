// Operação (segunda leva): Planos, Produtos & estoque, Contratos, Prospects, Comunicação e Relatórios.
import { esc, abrirFolha, perguntar, toast, dataLonga, horaTexto } from "../ui/util.js";
import { reais, csv, competenciaTexto } from "../ui/util-admin.js";
import { nomeFaixa, faixasDe, CORES_FAIXA } from "../ui/faixa.js";
import { hojeISO, diasEntre, diaSemana, dataValida } from "../logica/datas.js";
import { preencher, varsParaContato } from "../logica/modelos.js";
import { PUBLICOS, publico } from "../logica/publicos.js";
import { presencaPorDia, presencaPorHorario, ranking, receitaPorPlano } from "../logica/relatorios.js";
import { resumoFinanceiro } from "../logica/financeiro.js";
import { icone } from "../menu.js";
import { cabecalho, pessoa, porId, DIAS_CURTOS, aba, daAba, abasCategoria, ligarAbas, etiquetaPrograma } from "./comum.js";
import { abrirFormAluno } from "./alunos.js";

const erroEm = (el, sel, msg) => { const e = el.querySelector(sel); e.textContent = msg; e.hidden = false; };
const opcoes = (lista, atual) => lista.map(v => Array.isArray(v) ? v : [v, v]).map(([v, t]) => `<option value="${esc(v)}"${v === atual ? " selected" : ""}>${esc(t)}</option>`).join("");
const kpi = (rotulo, valor, sub = "", classe = "") => `<div class="kpi ${classe}"><div class="kpi-top"><span>${rotulo}</span></div><b>${valor}</b><small>${sub}</small></div>`;
const barras = (itens, destaque = -1) => {
  const max = Math.max(1, ...itens.map(i => i.n));
  return `<div class="barras">${itens.map((i, k) => `<div class="col"><div class="bar${k === destaque ? " on" : ""}" style="height:${Math.round(i.n / max * 100)}%"><i>${i.n}</i></div><small>${esc(i.rotulo)}</small></div>`).join("")}</div>`;
};
function baixar(nome, conteudo) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([conteudo], { type: "text/csv;charset=utf-8" }));
  a.download = nome; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
async function copiar(texto) {
  try { await navigator.clipboard.writeText(texto); toast("Copiado!"); } catch { toast("Não deu para copiar neste navegador"); }
}

// ---------- Planos ----------
function formPlano(store, plano, pronto) {
  const p = plano || { nome: "", meses: 1, valor: "", descricao: "" };
  abrirFolha((el, fechar) => {
    el.innerHTML = `<h3>${plano ? `Plano ${esc(plano.nome)}` : "Novo plano"}</h3><form class="campos" novalidate>
      <div class="field cheio"><label for="pl-nome">Nome</label><input class="input" id="pl-nome" value="${esc(p.nome)}"${plano ? " disabled" : ""}></div>
      <div class="field"><label for="pl-meses">Duração</label><select class="input" id="pl-meses">${opcoes([["1", "Mensal"], ["3", "Trimestral"], ["6", "Semestral"], ["12", "Anual"]], String(p.meses))}</select></div>
      <div class="field"><label for="pl-valor">Valor (R$)</label><input class="input" type="number" min="1" step="0.01" inputmode="decimal" id="pl-valor" value="${esc(p.valor)}"></div>
      <div class="field cheio"><label for="pl-desc">Descrição</label><input class="input" id="pl-desc" value="${esc(p.descricao)}"></div>
      ${plano ? `<label class="cheio" style="display:flex;gap:8px;align-items:center;font-size:13px"><input type="checkbox" id="pl-aplicar"> Aplicar o novo valor aos alunos atuais deste plano</label>` : ""}
      <p class="aviso cheio" id="pl-erro" hidden></p>
      <div class="acoes cheio"><button type="button" class="btn ghost" id="pl-x">Cancelar</button><button class="btn">Salvar</button></div></form>`;
    el.querySelector("#pl-x").onclick = fechar;
    el.querySelector("form").onsubmit = e => {
      e.preventDefault();
      const d = store.dados, nome = el.querySelector("#pl-nome").value.trim(), valor = Number(el.querySelector("#pl-valor").value);
      if (!plano && nome.length < 3) return erroEm(el, "#pl-erro", "Dê um nome ao plano.");
      if (!plano && d.planos.some(x => x.id.toLowerCase() === nome.toLowerCase())) return erroEm(el, "#pl-erro", "Já existe um plano com esse nome.");
      if (!(valor > 0 && valor <= 100000)) return erroEm(el, "#pl-erro", "Informe um valor entre R$ 0,01 e R$ 100.000.");
      const campos = { meses: Number(el.querySelector("#pl-meses").value), valor, descricao: el.querySelector("#pl-desc").value.trim() };
      if (plano) {
        Object.assign(plano, campos);
        if (el.querySelector("#pl-aplicar").checked) d.alunos.filter(a => a.plano === plano.id).forEach(a => { a.valor = valor; });
      } else d.planos.push({ id: nome, nome, ativo: true, ...campos });
      store.salvar(); fechar(); toast("Plano salvo"); pronto();
    };
  });
}

export const planos = {
  titulo: "Planos",
  montar(el, params, ctx) {
    const { store } = ctx, d = store.dados, receita = receitaPorPlano(d.alunos, d.planos);
    el.innerHTML = cabecalho("Planos", "Condições de matrícula. Novos alunos só veem planos ativos.", `<button class="btn" id="novo">${icone("planos")}Novo plano</button>`) +
      `<div class="kpis">${kpi("Planos ativos", d.planos.filter(p => p.ativo).length)}${kpi("Receita mensal equivalente", reais(receita.reduce((s, r) => s + r.mensal, 0)), "alunos ativos × valor por mês", "destaque")}</div>
      <div class="grade3">${d.planos.map(p => { const r = receita.find(x => x.id === p.id);
        return `<div class="card" style="display:flex;flex-direction:column;gap:10px${p.ativo ? "" : ";opacity:.6"}">
          <div class="card-cab" style="margin:0"><h3>${esc(p.nome)}</h3>${p.ativo ? '<span class="pill ok">Ativo</span>' : '<span class="pill">Inativo</span>'}</div>
          <b style="font-size:26px">${reais(p.valor)}</b><small class="muted">${p.meses === 1 ? "por mês" : `a cada ${p.meses} meses · ${reais(p.valor / p.meses)}/mês`}</small>
          <p class="muted" style="margin:0;font-size:12.5px">${esc(p.descricao || "")}</p>
          <div class="dados" style="grid-template-columns:1fr 1fr"><div><small>Alunos ativos</small><b>${r.alunos}</b></div><div><small>Por mês</small><b>${reais(r.mensal)}</b></div></div>
          <div style="display:flex;gap:8px"><button class="btn sec peq" data-editar="${esc(p.id)}">Editar</button><button class="btn sec peq" data-ativar="${esc(p.id)}">${p.ativo ? "Desativar" : "Ativar"}</button></div></div>`;
      }).join("")}</div>`;
    el.querySelector("#novo").onclick = () => formPlano(store, null, ctx.redesenhar);
    el.querySelectorAll("[data-editar]").forEach(b => b.onclick = () => formPlano(store, d.planos.find(p => p.id === b.dataset.editar), ctx.redesenhar));
    el.querySelectorAll("[data-ativar]").forEach(b => b.onclick = () => {
      const p = d.planos.find(x => x.id === b.dataset.ativar);
      if (p.ativo && d.planos.filter(x => x.ativo).length === 1) { toast("Deixe pelo menos um plano ativo"); return; }
      p.ativo = !p.ativo; store.salvar(); toast(p.ativo ? "Plano ativado" : "Plano desativado"); ctx.redesenhar();
    });
  }
};

// ---------- Produtos & estoque ----------
const statusEstoque = p => p.estoque <= 0 ? '<span class="pill ruim">Em falta</span>' : p.estoque < p.minimo ? '<span class="pill alerta">Estoque baixo</span>' : '<span class="pill ok">Disponível</span>';
const estadoPr = { cat: null };

function formProduto(store, prod, pronto) {
  const p = prod || { nome: "", categoria: "Uniformes", preco: "", estoque: 0, minimo: 2 };
  abrirFolha((el, fechar) => {
    el.innerHTML = `<h3>${prod ? "Editar produto" : "Novo produto"}</h3><form class="campos" novalidate>
      <div class="field cheio"><label for="po-nome">Produto</label><input class="input" id="po-nome" value="${esc(p.nome)}"></div>
      <div class="field"><label for="po-cat">Categoria</label><select class="input" id="po-cat">${opcoes(["Uniformes", "Faixas", "Acessórios", "Outros"], p.categoria)}</select></div>
      <div class="field"><label for="po-preco">Preço (R$)</label><input class="input" type="number" min="0" step="0.01" id="po-preco" value="${esc(p.preco)}"></div>
      <div class="field"><label for="po-est">Estoque</label><input class="input" type="number" min="0" step="1" id="po-est" value="${esc(p.estoque)}"></div>
      <div class="field"><label for="po-min">Mínimo</label><input class="input" type="number" min="0" step="1" id="po-min" value="${esc(p.minimo)}"></div>
      <p class="aviso cheio" id="po-erro" hidden></p>
      <div class="acoes cheio"><button type="button" class="btn ghost" id="po-x">Cancelar</button><button class="btn">Salvar</button></div>
      ${prod ? '<button type="button" class="link cheio" id="po-del" style="justify-self:center">Excluir produto</button>' : ""}</form>`;
    el.querySelector("#po-x").onclick = fechar;
    el.querySelector("#po-del")?.addEventListener("click", async () => { fechar(); if (!await perguntar("Excluir produto?", prod.nome, "Excluir", "Cancelar")) return; store.dados.produtos = store.dados.produtos.filter(x => x !== prod); store.salvar(); fechar(); toast("Produto excluído"); pronto(); });
    el.querySelector("form").onsubmit = e => {
      e.preventDefault();
      const nome = el.querySelector("#po-nome").value.trim(), preco = Number(el.querySelector("#po-preco").value);
      const estoque = Number(el.querySelector("#po-est").value), minimo = Number(el.querySelector("#po-min").value);
      if (nome.length < 2) return erroEm(el, "#po-erro", "Escreva o nome do produto.");
      if (["#po-preco", "#po-est", "#po-min"].some(id => el.querySelector(id).value.trim() === "")) return erroEm(el, "#po-erro", "Preencha preço, estoque e mínimo.");
      if (!(preco >= 0 && preco <= 100000) || !Number.isInteger(estoque) || estoque < 0 || estoque > 100000 || !Number.isInteger(minimo) || minimo < 0 || minimo > 100000) return erroEm(el, "#po-erro", "Preço, estoque e mínimo precisam ser números (estoque e mínimo inteiros).");
      const campos = { nome, categoria: el.querySelector("#po-cat").value, preco, estoque, minimo };
      if (prod) Object.assign(prod, campos); else store.dados.produtos.push({ id: store.novoId("p"), ...campos });
      store.salvar(); fechar(); toast("Produto salvo"); pronto();
    };
  });
}

export const produtos = {
  titulo: "Produtos & estoque",
  montar(el, params, ctx) {
    const { store } = ctx, d = store.dados;
    const cats = [...new Set(d.produtos.map(p => p.categoria))];
    const lista = d.produtos.filter(p => !estadoPr.cat || p.categoria === estadoPr.cat);
    el.innerHTML = cabecalho("Produtos & estoque", "Uniformes, faixas e acessórios da loja.", `<button class="btn" id="novo">${icone("produtos")}Novo produto</button>`) +
      `<div class="kpis">${kpi("Itens no estoque", d.produtos.reduce((s, p) => s + p.estoque, 0), `${d.produtos.length} produtos`)}
        ${kpi("Valor em estoque", reais(d.produtos.reduce((s, p) => s + p.estoque * p.preco, 0)), "a preço de venda", "destaque")}
        ${kpi("Abaixo do mínimo", d.produtos.filter(p => p.estoque > 0 && p.estoque < p.minimo).length, "repor em breve")}
        ${kpi("Em falta", d.produtos.filter(p => p.estoque <= 0).length, "sem unidades", d.produtos.some(p => p.estoque <= 0) ? "ruim" : "")}</div>
      <div class="chips">${cats.map(c => `<button class="chip${estadoPr.cat === c ? " on" : ""}" data-c="${esc(c)}">${esc(c)}</button>`).join("")}</div>
      <div class="card">${lista.length ? `<table class="tabela resp"><thead><tr><th>Produto</th><th>Categoria</th><th class="num">Preço</th><th>Estoque</th><th>Status</th><th></th></tr></thead><tbody>${lista.map(p => `<tr>
        <td class="cheia"><b>${esc(p.nome)}</b><br><small class="muted">mínimo ${p.minimo}</small></td><td class="esconde-m">${esc(p.categoria)}</td><td class="num">${reais(p.preco)}</td>
        <td><div style="display:flex;align-items:center;gap:6px"><button class="btn sec peq" data-mais="${esc(p.id)}" data-n="-1" aria-label="Tirar uma unidade de ${esc(p.nome)}"${p.estoque <= 0 ? " disabled" : ""}>−</button><b style="min-width:22px;text-align:center">${p.estoque}</b><button class="btn sec peq" data-mais="${esc(p.id)}" data-n="1" aria-label="Somar uma unidade de ${esc(p.nome)}">+</button></div></td>
        <td>${statusEstoque(p)}</td><td class="num"><button class="btn sec peq" data-editar="${esc(p.id)}">Editar</button></td></tr>`).join("")}</tbody></table>` : `<div class="vazio">Nenhum produto.</div>`}</div>`;
    el.querySelectorAll("[data-c]").forEach(b => b.onclick = () => { estadoPr.cat = estadoPr.cat === b.dataset.c ? null : b.dataset.c; ctx.redesenhar(); });
    el.querySelector("#novo").onclick = () => formProduto(store, null, ctx.redesenhar);
    el.querySelectorAll("[data-editar]").forEach(b => b.onclick = () => formProduto(store, d.produtos.find(p => p.id === b.dataset.editar), ctx.redesenhar));
    el.querySelectorAll("[data-mais]").forEach(b => b.onclick = () => {
      const p = d.produtos.find(x => x.id === b.dataset.mais);
      p.estoque = Math.max(0, p.estoque + Number(b.dataset.n)); store.salvar(); ctx.redesenhar();
    });
  }
};

// ---------- Contratos ----------
const estadoCt = { filtro: "Todos" };

function verContrato(store, ct, aluno, pronto) {
  const d = store.dados, modelo = d.modelosDoc.find(m => m.id === ct.modeloId) || d.modelosDoc[0];
  const texto = aluno && modelo ? preencher(modelo.texto, varsParaContato(aluno, d, ct.emissao)) : "Modelo ou aluno não encontrado.";
  abrirFolha((el, fechar) => {
    el.innerHTML = `<h3>${esc(ct.numero)}</h3><p class="muted" style="margin:0">${esc(modelo?.nome || "")} · emitido em ${dataLonga(ct.emissao)}</p>
      <pre style="white-space:pre-wrap;font-family:inherit;background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px;margin:0;font-size:13px;max-height:45vh;overflow:auto">${esc(texto)}</pre>
      <div class="acoes"><button class="btn ghost" id="ct-copiar">Copiar texto</button>${ct.status === "assinado" ? '<button class="btn" id="ct-x">Fechar</button>' : '<button class="btn" id="ct-assinar">Marcar como assinado</button>'}</div>`;
    el.querySelector("#ct-copiar").onclick = () => copiar(texto);
    el.querySelector("#ct-x")?.addEventListener("click", fechar);
    el.querySelector("#ct-assinar")?.addEventListener("click", () => { ct.status = "assinado"; store.salvar(); fechar(); toast("Contrato assinado"); pronto(); });
  });
}

export const contratos = {
  titulo: "Contratos",
  montar(el, params, ctx) {
    const { store } = ctx, d = store.dados, alunos = porId(d.alunos);
    const lista = d.contratos.filter(c => estadoCt.filtro === "Todos" || c.status === estadoCt.filtro.toLowerCase().replace("pendentes", "pendente").replace("assinados", "assinado"))
      .sort((a, b) => (a.status === "pendente" ? -1 : 0) - (b.status === "pendente" ? -1 : 0) || b.emissao.localeCompare(a.emissao));
    const pend = d.contratos.filter(c => c.status === "pendente").length;
    el.innerHTML = cabecalho("Contratos", "Um contrato por matrícula, gerado a partir do modelo de documento.") +
      `<div class="kpis">${kpi("Contratos", d.contratos.length)}${kpi("Pendentes de assinatura", pend, "cobrar na recepção", pend ? "destaque" : "")}${kpi("Assinados", d.contratos.length - pend)}</div>
      <div class="chips">${["Todos", "Pendentes", "Assinados"].map(f => `<button class="chip${estadoCt.filtro === f ? " on" : ""}" data-f="${f}">${f}</button>`).join("")}</div>
      <div class="card">${lista.length ? `<table class="tabela resp"><thead><tr><th>Contrato</th><th>Aluno</th><th>Emissão</th><th>Status</th><th></th></tr></thead><tbody>${lista.map(c => { const a = alunos[c.alunoId];
        return `<tr><td><b>${esc(c.numero)}</b></td><td class="cheia">${a ? pessoa(a, esc(a.plano)) : "Aluno removido"}</td><td data-l="Emissão:">${dataLonga(c.emissao)}</td>
          <td>${c.status === "assinado" ? '<span class="pill ok">Assinado</span>' : '<span class="pill alerta">Pendente</span>'}</td><td class="num"><button class="btn sec peq" data-ver="${esc(c.id)}">Ver</button></td></tr>`;
      }).join("")}</tbody></table>` : `<div class="vazio">Nenhum contrato com esse filtro.</div>`}</div>`;
    el.querySelectorAll("[data-f]").forEach(b => b.onclick = () => { estadoCt.filtro = b.dataset.f; ctx.redesenhar(); });
    el.querySelectorAll("[data-ver]").forEach(b => b.onclick = () => { const c = d.contratos.find(x => x.id === b.dataset.ver); verContrato(store, c, alunos[c.alunoId], ctx.redesenhar); });
  }
};

// ---------- Prospects ----------
const ETAPAS = [["novo", "Novos"], ["contato", "Em contato"], ["experimental", "Aula experimental"], ["matriculado", "Matriculados"], ["perdido", "Perdidos"]];

function formProspect(store, pr, pronto) {
  const p = pr || { nome: "", telefone: "", interesse: "Adulto iniciante", origem: "Instagram", obs: "" };
  abrirFolha((el, fechar) => {
    el.innerHTML = `<h3>${pr ? "Editar prospect" : "Novo prospect"}</h3><form class="campos" novalidate>
      <div class="field cheio"><label for="ps-nome">Nome</label><input class="input" id="ps-nome" value="${esc(p.nome)}"></div>
      <div class="field"><label for="ps-tel">Telefone</label><input class="input" id="ps-tel" inputmode="tel" value="${esc(p.telefone)}"></div>
      <div class="field"><label for="ps-orig">Origem</label><select class="input" id="ps-orig">${opcoes(["Instagram", "Indicação", "Google", "Site", "Passou na porta", "Outro"], p.origem)}</select></div>
      <div class="field cheio"><label for="ps-int">Interesse</label><input class="input" id="ps-int" value="${esc(p.interesse)}"></div>
      <div class="field cheio"><label for="ps-obs">Observação</label><input class="input" id="ps-obs" value="${esc(p.obs)}"></div>
      <p class="aviso cheio" id="ps-erro" hidden></p>
      <div class="acoes cheio"><button type="button" class="btn ghost" id="ps-x">Cancelar</button><button class="btn">Salvar</button></div></form>`;
    el.querySelector("#ps-x").onclick = fechar;
    el.querySelector("form").onsubmit = e => {
      e.preventDefault();
      const nome = el.querySelector("#ps-nome").value.trim(), telefone = el.querySelector("#ps-tel").value.trim();
      if (nome.length < 3) return erroEm(el, "#ps-erro", "Escreva o nome.");
      if (telefone.replace(/\D/g, "").length < 8) return erroEm(el, "#ps-erro", "Informe um telefone para contato.");
      const campos = { nome, telefone, origem: el.querySelector("#ps-orig").value, interesse: el.querySelector("#ps-int").value.trim(), obs: el.querySelector("#ps-obs").value.trim() };
      if (pr) Object.assign(pr, campos); else store.dados.prospects.unshift({ id: store.novoId("r"), etapa: "novo", criadoEm: hojeISO(), ...campos });
      store.salvar(); fechar(); toast("Prospect salvo"); pronto();
    };
  });
}

// Aula experimental: escolhe data e turma (as turmas daquele dia da semana).
function agendarExperimental(store, p, pronto) {
  const d = store.dados, hoje = hojeISO();
  let data = p.experimental?.data && p.experimental.data >= hoje ? p.experimental.data : hoje;
  abrirFolha((el, fechar) => {
    const desenhar = () => {
      const turmas = d.turmas.filter(t => t.diaSemana === diaSemana(data)).sort((a, b) => a.horario.localeCompare(b.horario));
      el.innerHTML = `<h3>Aula experimental</h3><p class="muted" style="margin:0">${esc(p.nome)} · ${esc(p.interesse)}</p>
        <div class="field"><label for="ex-data">Dia</label><input class="input" type="date" id="ex-data" min="${hoje}" value="${data}"></div>
        <div class="field"><label>Turma</label>${turmas.length ? `<div class="lista">${turmas.map(t => `<button type="button" data-t="${esc(t.id)}" style="text-align:left;width:100%"><span class="hora">${horaTexto(t.horario)}</span><div class="cresce">${etiquetaPrograma(t.programa)}${t.publico ? ` <small>${esc(t.publico)}</small>` : ""}</div><span class="link">Marcar</span></button>`).join("")}</div>`
          : `<div class="vazio">Sem turmas nesse dia. Escolha outro.</div>`}</div>
        <button class="btn ghost bloco" id="ex-x">Cancelar</button>`;
      el.querySelector("#ex-data").onchange = e => { if (dataValida(e.target.value) && e.target.value >= hoje) data = e.target.value; desenhar(); };
      el.querySelector("#ex-x").onclick = fechar;
      el.querySelectorAll("[data-t]").forEach(b => b.onclick = () => {
        p.etapa = "experimental"; p.experimental = { data, turmaId: b.dataset.t };
        store.salvar(); fechar(); toast(`Aula experimental marcada para ${dataLonga(data)}`); pronto();
      });
    };
    desenhar();
  });
}

export const prospects = {
  titulo: "Prospects",
  montar(el, params, ctx) {
    const { store } = ctx, d = store.dados, hoje = hojeISO();
    const abertos = d.prospects.filter(p => !["matriculado", "perdido"].includes(p.etapa)).length;
    const fechados = d.prospects.filter(p => ["matriculado", "perdido"].includes(p.etapa));
    const taxa = fechados.length ? Math.round(fechados.filter(p => p.etapa === "matriculado").length / fechados.length * 100) : 0;
    el.innerHTML = cabecalho("Prospects", "Interessados em treinar, do primeiro contato à matrícula.", `<button class="btn" id="novo">${icone("prospects")}Novo prospect</button>`) +
      `<div class="kpis">${kpi("Em aberto", abertos, "aguardando retorno", "destaque")}${kpi("Aula experimental", d.prospects.filter(p => p.etapa === "experimental").length, "agendadas")}${kpi("Conversão", `${taxa}%`, "dos que fecharam, matricularam")}</div>
      <div class="funil">${ETAPAS.map(([id, nome], i) => { const l = d.prospects.filter(p => p.etapa === id);
        return `<div class="etapa"><h4>${nome} <span>${l.length}</span></h4>${l.map(p => `<div class="card prospect">
          <b>${esc(p.nome)}</b><small>${esc(p.interesse)} · ${esc(p.origem)}</small><small>${esc(p.telefone)} · há ${diasEntre(p.criadoEm, hoje)} dia${diasEntre(p.criadoEm, hoje) === 1 ? "" : "s"}</small>
          ${p.obs ? `<small class="obs">${esc(p.obs)}</small>` : ""}
          ${id === "experimental" && p.experimental ? (() => { const t = d.turmas.find(x => x.id === p.experimental.turmaId);
            return `<small class="obs" style="background:var(--good-soft);color:var(--good)">📅 ${dataLonga(p.experimental.data)}${t ? ` · ${horaTexto(t.horario)}` : ""}${p.experimental.data < hoje ? " · já passou" : ""}</small>`; })() : ""}
          <div class="mover">${i > 0 && id !== "matriculado" ? `<button class="btn sec peq" data-mover="${esc(p.id)}" data-para="${id === "perdido" ? "contato" : ETAPAS[i - 1][0]}" aria-label="Voltar etapa">‹</button>` : ""}
            <button class="btn sec peq" data-editar="${esc(p.id)}">Editar</button>
            ${id === "experimental" ? `<button class="btn peq" data-matricular="${esc(p.id)}">Matricular</button>` : ""}
            ${i < 2 ? `<button class="btn sec peq" data-mover="${esc(p.id)}" data-para="${ETAPAS[i + 1][0]}" aria-label="Avançar etapa">›</button>` : ""}
            ${["novo", "contato", "experimental"].includes(id) ? `<button class="btn sec peq" data-mover="${esc(p.id)}" data-para="perdido" aria-label="Marcar como perdido">✕</button>` : ""}</div></div>`).join("") || '<div class="vazio">—</div>'}</div>`;
      }).join("")}</div>`;
    el.querySelector("#novo").onclick = () => formProspect(store, null, ctx.redesenhar);
    el.querySelectorAll("[data-editar]").forEach(b => b.onclick = () => formProspect(store, d.prospects.find(p => p.id === b.dataset.editar), ctx.redesenhar));
    el.querySelectorAll("[data-mover]").forEach(b => b.onclick = () => {
      const p = d.prospects.find(x => x.id === b.dataset.mover);
      if (b.dataset.para === "experimental") return agendarExperimental(store, p, ctx.redesenhar);
      p.etapa = b.dataset.para; store.salvar(); ctx.redesenhar();
    });
    el.querySelectorAll("[data-matricular]").forEach(b => b.onclick = () => {
      const p = d.prospects.find(x => x.id === b.dataset.matricular);
      abrirFormAluno(store, null, a => { p.etapa = "matriculado"; p.alunoId = a.id; store.salvar(); ctx.ir(`aluno/${a.id}`); }, { nome: p.nome, telefone: p.telefone, categoria: "adulto" });
    });
  }
};

// ---------- Comunicação ----------
const estadoCm = { publico: "atrasados", modelo: null };
// Modelo sugerido para cada público (o usuário pode trocar).
const SUGESTAO = { ativos: "msg1", aniversariantes: "msg4", atrasados: "msg3", sumidos: "msg2", novos: "msg1", aptos: "msg5", prospects: "msg1", responsaveis: "msg6" };

export const comunicacao = {
  titulo: "Comunicação",
  montar(el, params, ctx) {
    const { store } = ctx, d = store.dados, hoje = hojeISO();
    if (!d.modelosMsg.some(m => m.id === estadoCm.modelo)) estadoCm.modelo = (d.modelosMsg.find(m => m.id === SUGESTAO[estadoCm.publico]) || d.modelosMsg[0])?.id || null;
    const modelo = d.modelosMsg.find(m => m.id === estadoCm.modelo);
    const destino = publico(estadoCm.publico, d, hoje);
    const nomePub = Object.fromEntries(PUBLICOS)[estadoCm.publico];
    el.innerHTML = cabecalho("Comunicação", "Escolha quem recebe e o modelo da mensagem. O envio aqui é simulado.") +
      `<div class="grade2">
        <div class="card" style="display:flex;flex-direction:column;gap:12px">
          <div class="field"><label for="cm-pub">Para quem</label><select class="input" id="cm-pub">${opcoes(PUBLICOS.map(([k, n]) => [k, `${n} (${publico(k, d, hoje).length})`]), estadoCm.publico)}</select></div>
          <div class="field"><label for="cm-mod">Modelo</label><select class="input" id="cm-mod">${opcoes(d.modelosMsg.map(m => [m.id, m.nome]), estadoCm.modelo)}</select></div>
          <div class="field"><label>Prévia${destino[0] ? ` para ${esc(destino[0].nome.split(" ")[0])}` : ""}</label>
            <div class="balao">${modelo ? esc(preencher(modelo.texto, destino[0]?.vars || {})) : "Crie um modelo em Modelos de mensagens."}</div></div>
          <button class="btn" id="enviar"${destino.length && modelo ? "" : " disabled"}>${icone("comunicacao")}Enviar para ${destino.length} pessoa${destino.length === 1 ? "" : "s"} (simulado)</button>
        </div>
        <div class="card"><div class="card-cab"><h3>Quem vai receber</h3><small>${destino.length}</small></div>
          ${destino.length ? `<div class="lista" style="max-height:340px;overflow:auto">${destino.map(p => `<div><div class="cresce"><b>${esc(p.nome)}</b><small>${esc(p.telefone || "sem telefone")}</small></div>
            <button class="btn sec peq" data-copiar="${esc(p.id)}">Copiar mensagem</button></div>`).join("")}</div>` : `<div class="vazio">Ninguém neste público agora.</div>`}</div>
      </div>
      <div class="card"><div class="card-cab"><h3>Enviadas</h3><small>${d.comunicacoes.length}</small></div>
        ${d.comunicacoes.length ? `<table class="tabela resp"><thead><tr><th>Mensagem</th><th>Público</th><th>Data</th><th class="num">Pessoas</th></tr></thead><tbody>${d.comunicacoes.map(c =>
          `<tr><td class="cheia"><b>${esc(c.titulo)}</b></td><td>${esc(c.publico)}</td><td>${dataLonga(c.data)}</td><td class="num">${c.total}</td></tr>`).join("")}</tbody></table>` : `<div class="vazio">Nada enviado ainda.</div>`}</div>`;
    el.querySelector("#cm-pub").onchange = e => { estadoCm.publico = e.target.value; estadoCm.modelo = SUGESTAO[e.target.value] || estadoCm.modelo; ctx.redesenhar(); };
    el.querySelector("#cm-mod").onchange = e => { estadoCm.modelo = e.target.value; ctx.redesenhar(); };
    el.querySelectorAll("[data-copiar]").forEach(b => b.onclick = () => { const p = destino.find(x => x.id === b.dataset.copiar); copiar(preencher(modelo?.texto || "", p.vars)); });
    el.querySelector("#enviar").onclick = async () => {
      if (!await perguntar("Enviar mensagem?", `"${modelo.nome}" para ${destino.length} pessoa(s): ${nomePub.toLowerCase()}. É uma simulação: nada sai daqui.`, "Enviar", "Cancelar")) return;
      d.comunicacoes.unshift({ id: store.novoId("cm"), data: hoje, titulo: modelo.nome, publico: nomePub, total: destino.length, canal: "WhatsApp" });
      store.salvar(); toast("Envio registrado (simulado)"); ctx.redesenhar();
    };
  }
};

// ---------- Relatórios ----------
export const relatorios = {
  titulo: "Relatórios",
  montar(el, params, ctx) {
    const { store } = ctx, d = store.dados, hoje = hojeISO();
    const alunosAba = d.alunos.filter(daAba), ids = new Set(alunosAba.map(a => a.id));
    const turmasAba = d.turmas.filter(t => (t.categoria || "adulto") === aba()), checkinsAba = d.checkins.filter(c => ids.has(c.alunoId));
    const porDia = presencaPorDia(checkinsAba, hoje, 30), porHora = presencaPorHorario(checkinsAba, turmasAba, hoje, 30);
    const top = ranking(checkinsAba, alunosAba, hoje, 10), receita = receitaPorPlano(alunosAba, d.planos).filter(r => r.alunos);
    const ativos = alunosAba.filter(a => a.status === "ativo");
    const novos90 = alunosAba.filter(a => diasEntre(a.desde, hoje) <= 90).length;
    const fin = resumoFinanceiro(d.mensalidades, alunosAba, hoje.slice(0, 7), hoje);
    const porFaixa = faixasDe(aba()).map(f => [f, ativos.filter(a => a.faixa === f).length]), maxF = Math.max(1, ...porFaixa.map(x => x[1]));
    const maxHora = porHora.reduce((m, h) => (h.n > m.n ? h : m), porHora[0] || { n: 0 });
    el.innerHTML = cabecalho("Relatórios", "Últimos 30 dias, salvo indicação.", `<button class="btn sec" id="csv">${icone("documentos")}Exportar frequência (CSV)</button>`) + abasCategoria(d) +
      `<div class="kpis">${kpi("Presenças (30 dias)", porDia.reduce((s, n) => s + n, 0), `${(porDia.reduce((s, n) => s + n, 0) / Math.max(1, ativos.length)).toFixed(1).replace(".", ",")} por aluno ativo`, "destaque")}
        ${kpi("Horário mais cheio", horaTexto(maxHora.horario || ""), `${maxHora.n} presenças`)}
        ${kpi("Novos (90 dias)", novos90, `${alunosAba.filter(a => a.status === "trancado").length} trancados no total`)}
        ${kpi("Recebido do mês", `${fin.previsto ? Math.round(fin.recebido / fin.previsto * 100) : 0}%`, competenciaTexto(hoje.slice(0, 7)))}</div>
      <div class="grade2">
        <div class="card"><div class="card-cab"><h3>Presença por dia da semana</h3></div>${barras([1, 2, 3, 4, 5, 6].map(i => ({ rotulo: DIAS_CURTOS[i], n: porDia[i] })))}</div>
        <div class="card"><div class="card-cab"><h3>Presença por horário</h3></div>${barras(porHora.map(h => ({ rotulo: horaTexto(h.horario), n: h.n })), porHora.indexOf(maxHora))}</div>
        <div class="card"><div class="card-cab"><h3>Receita por plano</h3><small>por mês, alunos ativos</small></div>
          <table class="tabela"><thead><tr><th>Plano</th><th class="num">Alunos</th><th class="num">Por mês</th></tr></thead><tbody>${receita.map(r => `<tr><td><b>${esc(r.nome)}</b></td><td class="num">${r.alunos}</td><td class="num">${reais(r.mensal)}</td></tr>`).join("")}
          <tr><td><b>Total</b></td><td class="num"><b>${receita.reduce((s, r) => s + r.alunos, 0)}</b></td><td class="num"><b>${reais(receita.reduce((s, r) => s + r.mensal, 0))}</b></td></tr></tbody></table></div>
        <div class="card"><div class="card-cab"><h3>Alunos ativos por faixa</h3></div>
          <div class="dist">${porFaixa.map(([f, n]) => `<div class="linha"><span>${nomeFaixa(f)}</span><div class="trilho"><i style="width:${Math.round(n / maxF * 100)}%;background:${CORES_FAIXA[f]}"></i></div><span>${n}</span></div>`).join("")}</div></div>
        <div class="card"><div class="card-cab"><h3>Por que saem</h3><small>${alunosAba.filter(a => a.status === "trancado").length} trancados</small></div>
          ${(() => { const cont = {}; alunosAba.filter(a => a.status === "trancado").forEach(a => { const m = a.trancamento?.motivo || "Sem motivo"; cont[m] = (cont[m] || 0) + 1; });
            const l = Object.entries(cont).sort((x, y) => y[1] - x[1]), mx = Math.max(1, ...l.map(x => x[1]));
            return l.length ? `<div class="dist">${l.map(([m, n]) => `<div class="linha"><span>${esc(m)}</span><div class="trilho"><i style="width:${Math.round(n / mx * 100)}%;background:var(--red)"></i></div><span>${n}</span></div>`).join("")}</div>` : '<div class="vazio">Ninguém trancou a matrícula.</div>'; })()}</div>
        <div class="card"><div class="card-cab"><h3>Quem mais treinou</h3><small>top 10</small></div>
          <div class="lista">${top.map((t, i) => `<a href="#aluno/${encodeURIComponent(t.aluno.id)}"><span class="hora">${i + 1}º</span><div class="cresce"><b>${esc(t.aluno.nome)}</b><small>${nomeFaixa(t.aluno.faixa)}</small></div><span class="pill info">${t.n} aulas</span></a>`).join("")}</div></div>
      </div>`;
    ligarAbas(el, ctx);
    el.querySelector("#csv").onclick = () => baixar(`frequencia-${aba()}-${hoje}.csv`, csv([["Aluno", "Faixa", "Aulas 30 dias"], ...ranking(checkinsAba, alunosAba, hoje, 9999).map(t => [t.aluno.nome, nomeFaixa(t.aluno.faixa), t.n])]));
  }
};
