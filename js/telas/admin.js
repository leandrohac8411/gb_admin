// Administração (segunda leva): Modelos de documentos, Modelos de mensagens, Permissões, Portal do aluno e Configurações.
import { esc, abrirFolha, perguntar, toast, dataLonga, horaTexto, iniciais, saudacao } from "../ui/util.js";
import { reais, competenciaTexto } from "../ui/util-admin.js";
import { faixaSVG, nomeFaixa, faixasDe } from "../ui/faixa.js";
import { hojeISO, diaSemana, dataValida } from "../logica/datas.js";
import { preencher, varsParaContato, CAMPOS } from "../logica/modelos.js";
import { aptidao, aplicarRegras, regrasDe } from "../logica/graduacao.js";
import { statusMensalidade } from "../logica/financeiro.js";
import { aulasNosUltimos } from "../logica/relatorios.js";
import { MODULOS } from "../dados-extras.js";
import { validarDados, limparImportado } from "../store.js";
import { irmaos, mediaComportamento } from "../logica/familia.js";
import { icone } from "../menu.js";
import { cabecalho, etiquetaPrograma, nomeProfessor, PILL_STATUS, DIAS_LONGOS, estrelas } from "./comum.js";

const erroEm = (el, sel, msg) => { const e = el.querySelector(sel); e.textContent = msg; e.hidden = false; };
const opcoes = (lista, atual) => lista.map(v => Array.isArray(v) ? v : [v, v]).map(([v, t]) => `<option value="${esc(v)}"${v === atual ? " selected" : ""}>${esc(t)}</option>`).join("");
const ativosOrdenados = d => d.alunos.filter(a => a.status === "ativo").sort((x, y) => x.nome.localeCompare(y.nome, "pt-BR"));

// ---------- Modelos (documentos e mensagens) ----------
// tipo: { colecao, titulo, singular, extra: [rótulo do 2º campo, chave], rotulo do botão }
function formModelo(store, tipo, item, pronto) {
  const d = store.dados, x = item || { nome: "", [tipo.extra[1]]: "", texto: "" };
  abrirFolha((el, fechar) => {
    el.innerHTML = `<h3>${item ? `Editar ${tipo.singular}` : `Novo ${tipo.singular}`}</h3><form class="campos" novalidate>
      <div class="field"><label for="md-nome">Nome</label><input class="input" id="md-nome" value="${esc(x.nome)}"></div>
      <div class="field"><label for="md-extra">${tipo.extra[0]}</label><input class="input" id="md-extra" value="${esc(x[tipo.extra[1]] || "")}"></div>
      <div class="field cheio"><label for="md-txt">Texto</label><textarea class="input" id="md-txt" rows="${tipo.colecao === "modelosDoc" ? 9 : 4}">${esc(x.texto)}</textarea></div>
      <div class="cheio"><small class="muted">Toque para inserir um campo:</small><div class="chips" style="margin-top:6px">${CAMPOS.map(c => `<button type="button" class="chip" data-campo="${c}">{{${c}}}</button>`).join("")}</div></div>
      <p class="aviso cheio" id="md-erro" hidden></p>
      <div class="acoes cheio"><button type="button" class="btn ghost" id="md-x">Cancelar</button><button class="btn">Salvar</button></div>
      ${item ? `<button type="button" class="link cheio" id="md-del" style="justify-self:center">Excluir ${tipo.singular}</button>` : ""}</form>`;
    const txt = el.querySelector("#md-txt");
    el.querySelectorAll("[data-campo]").forEach(b => b.onclick = () => {
      const ins = `{{${b.dataset.campo}}}`, i = txt.selectionStart ?? txt.value.length;
      txt.value = txt.value.slice(0, i) + ins + txt.value.slice(txt.selectionEnd ?? i); txt.focus(); txt.selectionStart = txt.selectionEnd = i + ins.length;
    });
    el.querySelector("#md-x").onclick = fechar;
    el.querySelector("#md-del")?.addEventListener("click", async () => {
      fechar();
      if (tipo.colecao === "modelosDoc" && d.contratos.some(c => c.modeloId === item.id)) { toast("Há contratos usando este modelo"); return; }
      if (!await perguntar(`Excluir ${tipo.singular}?`, item.nome, "Excluir", "Cancelar")) return;
      d[tipo.colecao] = d[tipo.colecao].filter(y => y !== item); store.salvar(); toast("Modelo excluído"); pronto();
    });
    el.querySelector("form").onsubmit = e => {
      e.preventDefault();
      const nome = el.querySelector("#md-nome").value.trim(), texto = txt.value.trim();
      if (nome.length < 3) return erroEm(el, "#md-erro", "Dê um nome ao modelo.");
      if (texto.length < 5) return erroEm(el, "#md-erro", "Escreva o texto do modelo.");
      const campos = { nome, [tipo.extra[1]]: el.querySelector("#md-extra").value.trim(), texto, atualizadoEm: hojeISO() };
      if (item) Object.assign(item, campos); else d[tipo.colecao].push({ id: store.novoId("md"), ...campos });
      store.salvar(); fechar(); toast("Modelo salvo"); pronto();
    };
  });
}

function telaModelos(tipo) {
  const estado = { alunoId: null };
  return {
    titulo: tipo.titulo,
    montar(el, params, ctx) {
      const { store } = ctx, d = store.dados, hoje = hojeISO(), ativos = ativosOrdenados(d);
      if (!ativos.some(a => a.id === estado.alunoId)) estado.alunoId = ativos[0]?.id || null;
      const aluno = ativos.find(a => a.id === estado.alunoId), vars = aluno ? varsParaContato(aluno, d, hoje) : {};
      const lista = d[tipo.colecao];
      el.innerHTML = cabecalho(tipo.titulo, tipo.descricao, `<button class="btn" id="novo">${icone(tipo.icone)}Novo modelo</button>`) +
        `<div class="card filtros"><label for="md-aluno" class="forte" style="font-size:13px">Pré-visualizar com</label>
          <select class="input" id="md-aluno" style="max-width:320px">${opcoes(ativos.map(a => [a.id, a.nome]), estado.alunoId)}</select></div>
        ${lista.length ? `<div class="grade2">${lista.map(m => `<div class="card" style="display:flex;flex-direction:column;gap:10px">
          <div class="card-cab" style="margin:0"><div><h3>${esc(m.nome)}</h3><small>${esc(m[tipo.extra[1]] || "")}${m.atualizadoEm ? ` · atualizado em ${dataLonga(m.atualizadoEm)}` : ""}</small></div></div>
          <div class="${tipo.colecao === "modelosMsg" ? "balao" : "doc"}">${esc(preencher(m.texto, vars))}</div>
          <div style="display:flex;gap:8px"><button class="btn sec peq" data-editar="${esc(m.id)}">Editar</button><button class="btn sec peq" data-copiar="${esc(m.id)}">Copiar preenchido</button></div></div>`).join("")}</div>`
          : `<div class="card vazio">Nenhum modelo ainda.</div>`}`;
      el.querySelector("#md-aluno").onchange = e => { estado.alunoId = e.target.value; ctx.redesenhar(); };
      el.querySelector("#novo").onclick = () => formModelo(store, tipo, null, ctx.redesenhar);
      el.querySelectorAll("[data-editar]").forEach(b => b.onclick = () => formModelo(store, tipo, lista.find(m => m.id === b.dataset.editar), ctx.redesenhar));
      el.querySelectorAll("[data-copiar]").forEach(b => b.onclick = async () => {
        const m = lista.find(x => x.id === b.dataset.copiar);
        try { await navigator.clipboard.writeText(preencher(m.texto, vars)); toast("Copiado!"); } catch { toast("Não deu para copiar neste navegador"); }
      });
    }
  };
}

export const documentos = telaModelos({ colecao: "modelosDoc", titulo: "Modelos de documentos", singular: "documento", icone: "documentos",
  descricao: "Contratos, termos e declarações com os dados do aluno preenchidos.", extra: ["Tipo", "tipo"] });
export const mensagens = telaModelos({ colecao: "modelosMsg", titulo: "Modelos de mensagens", singular: "modelo de mensagem", icone: "mensagens",
  descricao: "Textos prontos usados na tela Comunicação.", extra: ["Finalidade", "finalidade"] });

// ---------- Permissões ----------
function formUsuario(store, u, pronto) {
  const d = store.dados, x = u || { nome: "", email: "", perfilId: "recepcao", ativo: true };
  abrirFolha((el, fechar) => {
    el.innerHTML = `<h3>${u ? "Editar usuário" : "Novo usuário"}</h3><form class="campos" novalidate>
      <div class="field cheio"><label for="us-nome">Nome</label><input class="input" id="us-nome" value="${esc(x.nome)}"></div>
      <div class="field cheio"><label for="us-email">E-mail</label><input class="input" type="email" id="us-email" value="${esc(x.email)}" autocomplete="off"></div>
      <div class="field cheio"><label for="us-perfil">Perfil</label><select class="input" id="us-perfil">${opcoes(d.perfis.map(p => [p.id, p.nome]), x.perfilId)}</select></div>
      <p class="aviso cheio" id="us-erro" hidden></p>
      <div class="acoes cheio"><button type="button" class="btn ghost" id="us-x">Cancelar</button><button class="btn">Salvar</button></div></form>`;
    el.querySelector("#us-x").onclick = fechar;
    el.querySelector("form").onsubmit = e => {
      e.preventDefault();
      const nome = el.querySelector("#us-nome").value.trim(), email = el.querySelector("#us-email").value.trim().toLowerCase();
      if (nome.length < 3) return erroEm(el, "#us-erro", "Escreva o nome.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return erroEm(el, "#us-erro", "E-mail inválido.");
      if (d.usuarios.some(y => y !== u && y.email === email)) return erroEm(el, "#us-erro", "Já existe um usuário com esse e-mail.");
      const campos = { nome, email, perfilId: el.querySelector("#us-perfil").value };
      if (u && u.perfilId === "admin" && campos.perfilId !== "admin" && u.ativo && d.usuarios.filter(y => y.ativo && y.perfilId === "admin").length === 1) return erroEm(el, "#us-erro", "Precisa haver pelo menos um administrador ativo.");
      if (u) Object.assign(u, campos); else d.usuarios.push({ id: store.novoId("u"), ativo: true, ...campos });
      store.salvar(); fechar(); toast("Usuário salvo"); pronto();
    };
  });
}

export const permissoes = {
  titulo: "Permissões",
  montar(el, params, ctx) {
    const { store } = ctx, d = store.dados, perfis = porIdLocal(d.perfis);
    el.innerHTML = cabecalho("Permissões", "O que cada perfil pode ver. Ilustrativo: o painel de teste não tem login.", `<button class="btn" id="novo">${icone("permissoes")}Novo usuário</button>`) +
      `<div class="card"><div class="card-cab"><h3>Usuários</h3><small>${d.usuarios.length}</small></div>
        <table class="tabela resp"><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th><th></th></tr></thead><tbody>${d.usuarios.map(u => `<tr${u.ativo ? "" : ' style="opacity:.55"'}>
          <td class="cheia"><div class="pessoa"><span class="av">${esc(iniciais(u.nome))}</span><b>${esc(u.nome)}</b></div></td><td>${esc(u.email)}</td><td><span class="pill info">${esc(perfis[u.perfilId]?.nome || "—")}</span></td>
          <td>${u.ativo ? '<span class="pill ok">Ativo</span>' : '<span class="pill">Inativo</span>'}</td>
          <td class="num"><button class="btn sec peq" data-editar="${esc(u.id)}">Editar</button> <button class="btn sec peq" data-ativo="${esc(u.id)}">${u.ativo ? "Desativar" : "Ativar"}</button></td></tr>`).join("")}</tbody></table></div>
      <div class="card" style="overflow-x:auto"><div class="card-cab"><h3>O que cada perfil acessa</h3><small>Administrador tem acesso total</small></div>
        <table class="tabela matriz"><thead><tr><th>Tela</th>${d.perfis.map(p => `<th style="text-align:center">${esc(p.nome)}</th>`).join("")}</tr></thead><tbody>${MODULOS.map(([id, nome]) => `<tr><td>${esc(nome)}</td>${d.perfis.map(p =>
          `<td style="text-align:center"><input type="checkbox" data-perfil="${esc(p.id)}" data-mod="${id}" aria-label="${esc(p.nome)} acessa ${esc(nome)}"${p.modulos.includes(id) ? " checked" : ""}${p.id === "admin" ? " disabled" : ""}></td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    el.querySelector("#novo").onclick = () => formUsuario(store, null, ctx.redesenhar);
    el.querySelectorAll("[data-editar]").forEach(b => b.onclick = () => formUsuario(store, d.usuarios.find(u => u.id === b.dataset.editar), ctx.redesenhar));
    el.querySelectorAll("[data-ativo]").forEach(b => b.onclick = () => {
      const u = d.usuarios.find(x => x.id === b.dataset.ativo);
      if (u.ativo && u.perfilId === "admin" && d.usuarios.filter(x => x.ativo && x.perfilId === "admin").length === 1) { toast("Precisa haver pelo menos um administrador ativo"); return; }
      u.ativo = !u.ativo; store.salvar(); ctx.redesenhar();
    });
    el.querySelectorAll("[data-mod]").forEach(c => c.onchange = () => {
      const p = d.perfis.find(x => x.id === c.dataset.perfil);
      p.modulos = c.checked ? [...new Set([...p.modulos, c.dataset.mod])] : p.modulos.filter(m => m !== c.dataset.mod);
      store.salvar(); toast(`${p.nome}: permissão ${c.checked ? "liberada" : "retirada"}`);
    });
  }
};
const porIdLocal = l => Object.fromEntries(l.map(x => [x.id, x]));

// ---------- Configurações ----------
export const config = {
  titulo: "Configurações",
  montar(el, params, ctx) {
    const { store } = ctx, d = store.dados, c = d.config, r = c.regras;
    const rk = c.regrasKids || { aulasPorGrau: 20, mesesPorGrau: 2, mesesMinFaixa: 6, idadeMin: { cinza: 4, amarela: 7, laranja: 10, verde: 13 } };
    const num = (id, rot, val, min, max) => `<div class="field"><label for="${id}">${rot}</label><input class="input" type="number" inputmode="numeric" id="${id}" min="${min}" max="${max}" step="1" value="${esc(val)}"></div>`;
    el.innerHTML = cabecalho("Configurações", "Dados da academia e regras usadas em todo o painel.") +
      `<form id="cfg" novalidate class="grade2">
        <div class="card"><div class="card-cab"><h3>Quem usa o painel</h3></div><div class="campos">
          <div class="field"><label for="cf-unome">Seu nome</label><input class="input" id="cf-unome" value="${esc(c.usuario?.nome ?? "Leandro")}"></div>
          <div class="field"><label for="cf-usexo">Saudação</label><select class="input" id="cf-usexo"><option value="M"${(c.usuario?.sexo ?? "M") === "M" ? " selected" : ""}>Bem-vindo</option><option value="F"${c.usuario?.sexo === "F" ? " selected" : ""}>Bem-vinda</option></select></div>
          <small class="muted cheio">Aparece no topo do Dashboard. Com login de verdade, viria do usuário que entrou.</small>
        </div></div>
        <div class="card"><div class="card-cab"><h3>Portal do aluno</h3></div><div class="campos">
          <p class="muted cheio" style="margin:0">O portal do aluno é o <b>Diário de Tatame</b>: o app no celular onde o aluno faz check-in, registra as aulas e acompanha a faixa.</p>
          <div class="field cheio"><label for="cf-diario">Endereço do Diário de Tatame</label><input class="input" id="cf-diario" inputmode="url" value="${esc(c.diarioUrl || "https://gracie-taupe.vercel.app")}"></div>
          <a class="btn sec cheio" href="${esc(c.diarioUrl || "https://gracie-taupe.vercel.app")}" target="_blank" rel="noopener noreferrer">Abrir o Diário de Tatame ↗</a>
        </div></div>
        <div class="card"><div class="card-cab"><h3>Academia</h3></div><div class="campos">
          <div class="field cheio"><label for="cf-nome">Nome</label><input class="input" id="cf-nome" value="${esc(c.academia.nome)}"></div>
          <div class="field cheio"><label for="cf-end">Endereço</label><input class="input" id="cf-end" value="${esc(c.academia.endereco)}"></div>
          <div class="field"><label for="cf-tel">Telefone</label><input class="input" id="cf-tel" value="${esc(c.academia.telefone)}"></div>
          <div class="field"><label for="cf-email">E-mail</label><input class="input" type="email" id="cf-email" value="${esc(c.academia.email)}"></div>
          ${num("cf-venc", "Dia de vencimento padrão", c.vencimentoPadrao, 1, 28)}${num("cf-meta", "Meta de treinos em 30 dias", c.metaAulas30, 1, 60)}
        </div></div>
        <div class="card"><div class="card-cab"><h3>Regras de graduação</h3></div><div class="campos">
          ${num("cf-aulas", "Aulas por grau", r.aulasPorGrau, 1, 200)}${num("cf-meses", "Meses mínimos por grau", r.mesesPorGrau, 0, 24)}
          ${["branca", "azul", "roxa", "marrom"].map(f => num(`cf-min-${f}`, `Meses mínimos na ${f}`, r.mesesMinFaixa[f], 0, 120)).join("")}
        </div></div>
        <div class="card"><div class="card-cab"><h3>Regras de graduação kids</h3><span class="tag kids">Kids</span></div><div class="campos">
          ${num("cf-k-aulas", "Aulas por grau", rk.aulasPorGrau, 1, 200)}${num("cf-k-meses", "Meses mínimos por grau", rk.mesesPorGrau, 0, 24)}
          ${num("cf-k-faixa", "Meses mínimos na faixa", rk.mesesMinFaixa, 0, 60)}
          ${["cinza", "amarela", "laranja", "verde"].map(f => num(`cf-k-${f}`, `Idade mínima: ${f}`, rk.idadeMin[f], 3, 17)).join("")}
        </div></div>
        <div class="card"><div class="card-cab"><h3>Ciclo do currículo</h3><a class="link" href="#cronogramas">Cronogramas</a></div>
          <div class="lista">${["GB1", "GB2"].map(p => { const an = c.ancoras.filter(a => a.programa === p).sort((x, y) => y.data.localeCompare(x.data))[0];
            return `<div><div class="cresce"><b>${p}</b><small>${an ? `semana ${an.semana} a partir de ${dataLonga(an.data)}` : "sem referência"}</small></div></div>`; }).join("")}</div></div>
        <div class="card" style="display:flex;flex-direction:column;gap:10px"><div class="card-cab"><h3>Dados de exemplo</h3></div>
          <p class="muted" style="margin:0">Tudo aqui é fictício e fica salvo só neste navegador. Restaurar volta a academia de exemplo do zero.</p>
          <button type="button" class="btn sec" id="cf-restaurar">${icone("restaurar")}Restaurar dados de exemplo</button>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn sec" id="cf-exportar">${icone("documentos")}Exportar backup (JSON)</button>
            <label class="btn sec" style="cursor:pointer">${icone("restaurar")}Importar backup<input type="file" id="cf-importar" accept="application/json,.json" hidden></label></div>
          <small class="muted">O backup guarda alunos, turmas, check-ins, financeiro e todo o resto num arquivo.</small></div>
        <p class="aviso" id="cf-erro" hidden style="grid-column:1/-1"></p>
        <div style="grid-column:1/-1;display:flex;justify-content:flex-end"><button class="btn">Salvar configurações</button></div>
      </form>`;
    el.querySelector("#cf-restaurar").onclick = () => document.getElementById("restaurar")?.click();
    el.querySelector("#cf-exportar").onclick = () => {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: "application/json" }));
      link.download = `gb-admin-backup-${hojeISO()}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      toast("Backup exportado");
    };
    el.querySelector("#cf-importar").onchange = async e => {
      const arq = e.target.files?.[0]; e.target.value = "";
      if (!arq) return;
      let novo = null;
      try { novo = JSON.parse(await arq.text()); } catch { /* arquivo não é JSON */ }
      if (!validarDados(novo)) { toast("Arquivo inválido: não é um backup desta versão do painel"); return; }
      if (!await perguntar("Importar backup?", `Os dados atuais serão trocados pelos do arquivo "${arq.name}". Dados importados não são refeitos na virada do mês; use "Restaurar dados de exemplo" para voltar à vitrine.`, "Importar", "Cancelar")) return;
      novo.geradoEm = hojeISO();
      store.dados = limparImportado(novo); store.salvar();
      aplicarRegras(novo.config.regras, novo.config.regrasKids);
      toast("Backup importado"); ctx.redesenhar();
    };
    el.querySelector("#cfg").onsubmit = e => {
      e.preventDefault();
      const v = id => el.querySelector(id).value.trim(), n = id => Number(v(id));
      const inteiros = ["#cf-venc", "#cf-meta", "#cf-aulas", "#cf-meses", "#cf-min-branca", "#cf-min-azul", "#cf-min-roxa", "#cf-min-marrom",
        "#cf-k-aulas", "#cf-k-meses", "#cf-k-faixa", "#cf-k-cinza", "#cf-k-amarela", "#cf-k-laranja", "#cf-k-verde"];
      const ruim = inteiros.find(id => { const x = el.querySelector(id), k = Number(x.value); return x.value === "" || !Number.isInteger(k) || k < Number(x.min) || k > Number(x.max); });
      if (v("#cf-nome").length < 2) return erroEm(el, "#cf-erro", "Escreva o nome da academia.");
      if (ruim) return erroEm(el, "#cf-erro", `Confira o campo "${el.querySelector(`label[for="${ruim.slice(1)}"]`).textContent}".`);
      const ik = ["cinza", "amarela", "laranja", "verde"].map(f => n(`#cf-k-${f}`));
      if (!ik.every((v, i) => i === 0 || ik[i - 1] <= v)) return erroEm(el, "#cf-erro", "As idades mínimas kids precisam subir: cinza ≤ amarela ≤ laranja ≤ verde.");
      const diario = v("#cf-diario");
      if (diario && !/^https:\/\/[^\s"'<>]+$/.test(diario)) return erroEm(el, "#cf-erro", "O endereço do Diário precisa começar com https://");
      c.diarioUrl = diario || "https://gracie-taupe.vercel.app";
      c.usuario = { nome: v("#cf-unome") || "Leandro", sexo: el.querySelector("#cf-usexo").value };
      c.academia = { nome: v("#cf-nome"), endereco: v("#cf-end"), telefone: v("#cf-tel"), email: v("#cf-email") };
      c.vencimentoPadrao = n("#cf-venc"); c.metaAulas30 = n("#cf-meta");
      c.regras = { aulasPorGrau: n("#cf-aulas"), mesesPorGrau: n("#cf-meses"), mesesMinFaixa: Object.fromEntries(["branca", "azul", "roxa", "marrom"].map(f => [f, n(`#cf-min-${f}`)])) };
      c.regrasKids = { aulasPorGrau: n("#cf-k-aulas"), mesesPorGrau: n("#cf-k-meses"), mesesMinFaixa: n("#cf-k-faixa"),
        idadeMin: Object.fromEntries(["cinza", "amarela", "laranja", "verde"].map(f => [f, n(`#cf-k-${f}`)])) };
      aplicarRegras(c.regras, c.regrasKids);
      store.salvar(); toast("Configurações salvas"); ctx.redesenhar();
    };
  }
};
