// Administração (segunda leva): Modelos de documentos, Modelos de mensagens, Permissões, Portal do aluno e Configurações.
import { lerGradeDiario } from "../logica/importar-grade.js";
import { paraLocal } from "../logica/mesclar.js";
import { esc, abrirFolha, perguntar, toast, dataLonga, horaTexto, iniciais, saudacao } from "../ui/util.js";
import { reais, competenciaTexto } from "../ui/util-admin.js";
import { faixaSVG, nomeFaixa, faixasDe } from "../ui/faixa.js";
import { hojeISO, diaSemana, dataValida } from "../logica/datas.js";
import { preencher, varsParaContato, CAMPOS } from "../logica/modelos.js";
import { aptidao, aplicarRegras, regrasDe, REGRAS, planoDaFaixa } from "../logica/graduacao.js";
import { statusMensalidade } from "../logica/financeiro.js";
import { aulasNosUltimos } from "../logica/relatorios.js";
import { MODULOS } from "../dados-extras.js";
import { logoAcademia, reduzirLogo } from "../ui/logo.js";
import { validarDados, limparImportado } from "../store.js";
import { aplicarGrade, temExemplos } from "../logica/baldes.js";
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
      <div class="field cheio"><label for="us-sexo">Saudação no painel</label><select class="input" id="us-sexo">${opcoes([["M", "Bem-vindo (masculino)"], ["F", "Bem-vinda (feminino)"]], x.sexo || "M")}</select></div>
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
      const campos = { nome, email, sexo: el.querySelector("#us-sexo").value === "F" ? "F" : "M", perfilId: el.querySelector("#us-perfil").value };
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
    const rk = c.regrasKids || { aulasPorGrau: 4, mesesPorGrau: 1, mesesMinFaixa: 6, idadeMin: { cinza: 4, amarela: 7, laranja: 10, verde: 13 } };
    const num = (id, rot, val, min, max) => `<div class="field"><label for="${id}">${rot}</label><input class="input" type="number" inputmode="numeric" id="${id}" min="${min}" max="${max}" step="1" value="${esc(val)}"></div>`;
    const cartaoAcao = (titulo, corpo, extra = "") => `<div class="card cfg-acao"><div class="card-cab"><h3>${titulo}</h3>${extra}</div>${corpo}</div>`;
    el.innerHTML = cabecalho("Configurações", "Dados da academia e regras usadas em todo o painel.") +
      `<form id="cfg" novalidate class="cfg">
        <div class="card"><div class="card-cab"><h3>Academia</h3><small>Aparece no menu, no topo, no login e no portal do aluno</small></div>
          <div class="cfg-academia">
            <div class="cfg-logo">
              <span class="cfg-logo-previa${logoAcademia(c) ? "" : " vazio-mini"}" id="cf-logo-previa" aria-hidden="true">${logoAcademia(c) ? `<img src="${esc(logoAcademia(c))}" alt="">` : icone("config")}</span>
              <b id="cf-logo-nome">${c.academia.logo ? "Logo cadastrada" : "Usando a logo padrão"}</b>
              <small class="muted">PNG com fundo transparente fica melhor.</small>
              <label class="btn sec peq" for="cf-logo">${c.academia.logo ? "Trocar logo" : "Escolher logo"}</label><input type="file" accept="image/png,image/jpeg,image/webp" id="cf-logo" hidden>
              ${c.academia.logo ? '<button type="button" class="btn ghost peq" id="cf-logo-tirar">Voltar para a logo padrão</button>' : ""}
            </div>
            <div class="campos cfg-dados">
              <div class="field cheio"><label for="cf-nome">Nome</label><input class="input" id="cf-nome" value="${esc(c.academia.nome)}"></div>
              <div class="field cheio"><label for="cf-end">Endereço</label><input class="input" id="cf-end" value="${esc(c.academia.endereco)}"></div>
              <div class="field"><label for="cf-tel">Telefone</label><input class="input" id="cf-tel" value="${esc(c.academia.telefone)}"></div>
              <div class="field"><label for="cf-email">E-mail</label><input class="input" type="email" id="cf-email" value="${esc(c.academia.email)}"></div>
              ${num("cf-venc", "Dia de vencimento padrão", c.vencimentoPadrao, 1, 28)}${num("cf-meta", "Meta de treinos em 30 dias", c.metaAulas30, 1, 60)}
            </div>
          </div></div>
        <div class="cfg-linha">
          <div class="card"><div class="card-cab"><h3>Regras de graduação</h3><span class="tag">Adultos</span></div>
            <p class="muted cfg-nota">O tempo de cada faixa é dividido em 4 graus + a troca de faixa. As aulas da faixa são estimadas pelos treinos por semana, descontando recesso e feriados. Para graduar, valem as duas coisas: o tempo e as aulas.</p>
            <div class="campos cfg-quatro">
              <p class="secao">Meses em cada faixa até a próxima</p>
              ${["branca", "azul", "roxa", "marrom"].map(f => num(`cf-fx-${f}`, f[0].toUpperCase() + f.slice(1), REGRAS.mesesFaixa[f], 1, 120)).join("")}
              <p class="secao">Base do cálculo das aulas</p>
              <div class="cfg-meia">${num("cf-treinos", "Treinos por semana", REGRAS.treinosPorSemana, 1, 7)}</div>
              <div class="cfg-meia">${num("cf-folga", "Folga para recesso e feriados (%)", REGRAS.folgaPct, 0, 50)}</div>
              <div class="cheio" id="cf-previa-grad"></div>
            </div></div>
          <div class="card"><div class="card-cab"><h3>Regras de graduação</h3><span class="tag kids">Kids</span></div>
            <p class="muted cfg-nota">Crianças pegam grau por mês, desde que tenham o mínimo de aulas no período. A troca de faixa depende do tempo na faixa e da idade.</p>
            <div class="campos cfg-quatro">
              <p class="secao">Graus</p>
              <div class="cfg-meia">${num("cf-k-meses", "Grau a cada (meses)", rk.mesesPorGrau, 1, 24)}</div>
              <div class="cfg-meia">${num("cf-k-aulas", "Mínimo de aulas no período", rk.aulasPorGrau, 0, 60)}</div>
              <p class="secao">Troca de faixa</p>
              <div class="cfg-meia">${num("cf-k-faixa", "Meses mínimos na faixa", rk.mesesMinFaixa, 0, 60)}</div>
              <p class="secao">Idade mínima para cada faixa</p>
              ${["cinza", "amarela", "laranja", "verde"].map(f => num(`cf-k-${f}`, f[0].toUpperCase() + f.slice(1), rk.idadeMin[f], 3, 17)).join("")}
            </div></div>
        </div>
        <div class="cfg-linha cfg-tres">
          ${cartaoAcao("Portal do aluno", `<p class="muted">Os alunos entram em <b>${esc(location.origin)}/aluno</b> com o e-mail liberado na ficha (ou no cadastro). Lá eles fazem check-in, veem as aulas, a foto e escrevem o diário.</p>
            <div class="cfg-botoes"><a class="btn sec" href="/aluno" target="_blank" rel="noopener">Abrir o portal do aluno ↗</a></div>`)}
          ${cartaoAcao("Ciclo do currículo", `<div class="lista">${["GB1", "GB2"].map(p => { const an = c.ancoras.filter(a => a.programa === p).sort((x, y) => y.data.localeCompare(x.data))[0];
            return `<div><div class="cresce"><b>${p}</b><small>${an ? `semana ${an.semana} a partir de ${dataLonga(an.data)}` : "sem referência"}</small></div></div>`; }).join("")}</div>
            <div class="cfg-botoes"><a class="btn sec" href="#cronogramas">Abrir cronogramas</a></div>`)}
          ${store.modo === "painel" ? cartaoAcao("Grade real (do Diário)", `<p class="muted">No Diário de Tatame, abra <b>Perfil › Exportar grade para o GB Admin</b> e escolha aqui o arquivo <b>grade-diario.json</b>. As turmas adultas passam a ser as reais; as kids continuam as de exemplo.</p>
            <p class="muted">${d.turmas.filter(t => t.real).length ? `Hoje: ${d.turmas.filter(t => t.real).length} turmas reais no banco.` : "Ainda sem grade real: os check-ins usam a grade de exemplo."}</p>
            <div class="cfg-botoes"><label class="btn sec" style="cursor:pointer">${icone("agenda")}Importar grade do Diário<input type="file" id="cf-grade" accept="application/json,.json" hidden></label></div>`) : ""}
          ${store.modo === "painel" ? cartaoAcao("Dados e backup", `<p class="muted">Tudo fica salvo no banco. ${temExemplos(d) ? "Os alunos, presenças, mensalidades e demais registros de exemplo podem ser apagados quando a academia real estiver cadastrada; os dados reais não são tocados." : "Não há mais dados de exemplo."}</p>
            <small class="muted">O backup guarda tudo (menos os rostos) num arquivo neste aparelho. Ele tem dados pessoais dos alunos: guarde com cuidado.</small>
            <div class="cfg-botoes">${temExemplos(d) ? `<button type="button" class="btn sec" id="cf-restaurar">${icone("restaurar")}Apagar dados de exemplo</button>` : ""}
            <button type="button" class="btn sec" id="cf-exportar">${icone("documentos")}Exportar backup (JSON)</button></div>`)
          : cartaoAcao("Dados e backup", `<p class="muted">Tudo aqui é fictício e fica salvo só neste navegador. Restaurar volta a academia de exemplo do zero.</p>
            <small class="muted">O backup guarda alunos, turmas, check-ins, financeiro e todo o resto num arquivo.</small>
            <div class="cfg-botoes"><button type="button" class="btn sec" id="cf-restaurar">${icone("restaurar")}Restaurar dados de exemplo</button>
            <button type="button" class="btn sec" id="cf-exportar">${icone("documentos")}Exportar backup (JSON)</button>
            <label class="btn sec" style="cursor:pointer">${icone("restaurar")}Importar backup<input type="file" id="cf-importar" accept="application/json,.json" hidden></label></div>`)}
        </div>
        <p class="aviso" id="cf-erro" hidden></p>
        <div class="cfg-salvar"><button class="btn">Salvar configurações</button></div>
      </form>`;
    el.querySelector("#cf-restaurar")?.addEventListener("click", () => document.getElementById("restaurar")?.click());
    el.querySelector("#cf-exportar").onclick = () => {
      const link = document.createElement("a");
      // Rostos nunca vão para um arquivo. Na demonstração, só os dados de exemplo.
      const { rostos, ...semRostos } = d;
      link.href = URL.createObjectURL(new Blob([JSON.stringify(store.modo === "painel" ? semRostos : paraLocal(d), null, 2)], { type: "application/json" }));
      link.download = `gb-admin-backup-${hojeISO()}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      toast("Backup exportado");
    };
    const importar = el.querySelector("#cf-importar");
    if (importar) importar.onchange = async e => {
      const arq = e.target.files?.[0]; e.target.value = "";
      if (!arq) return;
      // Arquivo gigante trava o navegador: backup real tem poucos MB.
      if (arq.size > 20 * 1024 * 1024) { toast("Arquivo grande demais para ser um backup do painel"); return; }
      let novo = null;
      // Chaves "__proto__"/"constructor"/"prototype" são descartadas (prototype pollution).
      const semChavesPerigosas = (k, v) => (k === "__proto__" || k === "constructor" || k === "prototype" ? undefined : v);
      try { novo = JSON.parse(await arq.text(), semChavesPerigosas); } catch { /* arquivo não é JSON */ }
      if (!validarDados(novo)) { toast("Arquivo inválido: não é um backup desta versão do painel"); return; }
      if (!await perguntar("Importar backup?", `Os dados atuais serão trocados pelos do arquivo "${arq.name}". Dados importados não são refeitos na virada do mês; use "Restaurar dados de exemplo" para voltar à vitrine.`, "Importar", "Cancelar")) return;
      novo.geradoEm = hojeISO();
      store.dados = limparImportado(novo); store.aposTrocarDados?.(); store.salvar();
      aplicarRegras(novo.config.regras, novo.config.regrasKids);
      toast("Backup importado"); ctx.redesenhar();
    };
    el.querySelector("#cf-grade")?.addEventListener("change", async e => {
      const arq = e.target.files?.[0]; e.target.value = "";
      if (!arq) return;
      let lida;
      try { lida = lerGradeDiario(arq.size > 300 * 1024 ? "" : await arq.text()); }
      catch { toast("Esse arquivo não é uma grade exportada pelo Diário."); return; }
      if (!lida.turmas.length) { toast("Nenhuma turma válida no arquivo."); return; }
      if (!await perguntar("Importar grade do Diário?", `${lida.turmas.length} turma${lida.turmas.length === 1 ? "" : "s"}${lida.descartadas ? ` (${lida.descartadas} descartada${lida.descartadas === 1 ? "" : "s"} por estar fora do formato)` : ""} ${lida.turmas.length === 1 ? "vai" : "vão"} para o banco. Turmas com o mesmo dia e horário são atualizadas.`, "Importar", "Cancelar")) return;
      aplicarGrade(store.dados, lida.turmas);
      if (store.salvar() !== false) toast(`${lida.turmas.length} turmas importadas${lida.descartadas ? `, ${lida.descartadas} descartadas` : ""}`);
      ctx.redesenhar();
    });
    // Prévia das regras de graduação: de quanto em quanto tempo vem o grau e quantas aulas a faixa pede.
    const previaGrad = () => {
      const val = id => Number(el.querySelector(id)?.value);
      const r = { mesesFaixa: Object.fromEntries(["branca", "azul", "roxa", "marrom"].map(f => [f, val(`#cf-fx-${f}`)])), treinosPorSemana: val("#cf-treinos"), folgaPct: val("#cf-folga") };
      const linhas = ["branca", "azul", "roxa", "marrom"].map(f => {
        const pl = r.mesesFaixa[f] > 0 && r.treinosPorSemana > 0 ? planoDaFaixa(f, r) : null;
        return pl ? `<tr><td>${f[0].toUpperCase() + f.slice(1)}</td><td>a cada ~${String(Math.round(pl.graus[0].dias / 30.44 * 10) / 10).replace(".", ",")} meses</td><td>4º grau ~${String(Math.round((pl.diasFaixa - pl.graus[3].dias) / 30.44 * 10) / 10).replace(".", ",")} meses antes da troca</td><td>~${pl.aulasFaixa} aulas (${pl.aulasPorGrau} por grau)</td></tr>` : "";
      }).join("");
      el.querySelector("#cf-previa-grad").innerHTML = `<table class="tabela"><thead><tr><th>Faixa</th><th>Graus</th><th>Último grau</th><th>Aulas na faixa</th></tr></thead><tbody>${linhas}</tbody></table>`;
    };
    ["#cf-fx-branca", "#cf-fx-azul", "#cf-fx-roxa", "#cf-fx-marrom", "#cf-treinos", "#cf-folga"].forEach(id => el.querySelector(id).addEventListener("input", previaGrad));
    previaGrad();
    // Logo: undefined = não mexeu; null = voltar para a padrão; texto = logo nova (já reduzida no aparelho).
    let logoNova;
    el.querySelector("#cf-logo").onchange = async ev => {
      const arq = ev.target.files?.[0]; ev.target.value = "";
      if (!arq) return;
      try { logoNova = await reduzirLogo(arq); } catch { toast("Não consegui abrir essa imagem."); return; }
      el.querySelector("#cf-logo-previa").innerHTML = `<img src="${logoNova}" alt="">`;
      el.querySelector("#cf-logo-previa").classList.remove("vazio-mini");
      el.querySelector("#cf-logo-nome").textContent = "Logo nova (salva ao tocar em Salvar configurações)";
    };
    el.querySelector("#cf-logo-tirar")?.addEventListener("click", () => {
      logoNova = null;
      el.querySelector("#cf-logo-previa").innerHTML = `<img src="img/logo-sobradinho.png" alt="">`;
      el.querySelector("#cf-logo-nome").textContent = "Volta para a logo padrão ao salvar";
    });
    el.querySelector("#cfg").onsubmit = e => {
      e.preventDefault();
      const v = id => el.querySelector(id).value.trim(), n = id => Number(v(id));
      const inteiros = ["#cf-venc", "#cf-meta", "#cf-fx-branca", "#cf-fx-azul", "#cf-fx-roxa", "#cf-fx-marrom", "#cf-treinos", "#cf-folga",
        "#cf-k-aulas", "#cf-k-meses", "#cf-k-faixa", "#cf-k-cinza", "#cf-k-amarela", "#cf-k-laranja", "#cf-k-verde"];
      const ruim = inteiros.find(id => { const x = el.querySelector(id), k = Number(x.value); return x.value === "" || !Number.isInteger(k) || k < Number(x.min) || k > Number(x.max); });
      if (v("#cf-nome").length < 2) return erroEm(el, "#cf-erro", "Escreva o nome da academia.");
      if (ruim) return erroEm(el, "#cf-erro", `Confira o campo "${el.querySelector(`label[for="${ruim.slice(1)}"]`).textContent}".`);
      const ik = ["cinza", "amarela", "laranja", "verde"].map(f => n(`#cf-k-${f}`));
      if (!ik.every((v, i) => i === 0 || ik[i - 1] <= v)) return erroEm(el, "#cf-erro", "As idades mínimas kids precisam subir: cinza ≤ amarela ≤ laranja ≤ verde.");
      c.academia = { nome: v("#cf-nome"), endereco: v("#cf-end"), telefone: v("#cf-tel"), email: v("#cf-email"), logo: logoNova !== undefined ? logoNova : (c.academia.logo || null) };
      c.vencimentoPadrao = n("#cf-venc"); c.metaAulas30 = n("#cf-meta");
      c.regras = { mesesFaixa: Object.fromEntries(["branca", "azul", "roxa", "marrom"].map(f => [f, n(`#cf-fx-${f}`)])), treinosPorSemana: n("#cf-treinos"), folgaPct: n("#cf-folga") };
      c.regrasKids = { aulasPorGrau: n("#cf-k-aulas"), mesesPorGrau: n("#cf-k-meses"), mesesMinFaixa: n("#cf-k-faixa"),
        idadeMin: Object.fromEntries(["cinza", "amarela", "laranja", "verde"].map(f => [f, n(`#cf-k-${f}`)])) };
      aplicarRegras(c.regras, c.regrasKids);
      store.salvar(); toast("Configurações salvas"); ctx.redesenhar();
    };
  }
};
