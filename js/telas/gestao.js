// Gestão acadêmica (segunda leva): Professores, Acompanhamentos, Cronogramas, Modelos de aula e Habilidades.
import { esc, abrirFolha, perguntar, toast, dataLonga, horaTexto, iniciais } from "../ui/util.js";
import { faixaSVG, nomeFaixa, FAIXAS } from "../ui/faixa.js";
import { hojeISO, somarDias, segundaDaSemana, diasEntre } from "../logica/datas.js";
import { semanaDoCiclo, CICLO_SEMANAS } from "../logica/ciclo.js";
import { aptidao } from "../logica/graduacao.js";
import { CATEGORIAS_TECNICAS } from "../dados-extras.js";
import { lerCurriculo, diaDeReferencia, aplicarCurriculo } from "../logica/tema.js";
import { icone } from "../menu.js";
import { cabecalho, pessoa, faixaCelula, etiquetaPrograma, porId, DIAS_CURTOS, daAba, abasCategoria, ligarAbas } from "./comum.js";
import { aulas30 } from "./alunos.js";
import { problemaNaFoto } from "../logica/cadastro-rosto.js";
import { salvarComAviso } from "../logica/mesclar.js";
import { professorTreina } from "../logica/professor-aluno.js";

const erroEm = (el, sel, msg) => { const e = el.querySelector(sel); e.textContent = msg; e.hidden = false; };
const opcoes = (lista, atual) => lista.map(v => Array.isArray(v) ? v : [v, v]).map(([v, t]) => `<option value="${esc(v)}"${v === atual ? " selected" : ""}>${esc(t)}</option>`).join("");

// ---------- Professores ----------
// No modo logado, o professor também tem "Rosto para check-in": a foto da aula reconhece quem é
// o professor e não lança presença para ele. O rosto fica na coleção "rostos" com o id do professor.
const rostoDe = (store, id) => store.modo === "painel" ? store.dados.rostos?.get(id) : null;

function campoRostoProfessor(r) {
  const n = r?.descritores?.length || 0;
  return `<div class="field cheio"><span class="rotulo">Foto do rosto para o check-in${n ? ` · ${n} de 3 fotos` : ""}</span>
    <div class="foto-escolha">
      <span class="rosto-mini${r?.mini ? "" : " vazio-mini"}" id="pr-foto-previa" aria-hidden="true">${r?.mini ? `<img src="${esc(r.mini)}" alt="">` : icone("professores")}</span>
      <div class="cresce"><b id="pr-foto-nome">${n ? "Rosto cadastrado" : "Nenhuma foto escolhida"}</b><small class="muted">${n < 3 ? "De frente, só a pessoa. A foto da aula passa a saber quem é o professor." : "Já tem as 3 fotos."}</small></div>
      ${n < 3 ? `<label class="btn sec peq" for="pr-foto" id="pr-foto-btn">${n ? "Adicionar foto" : "Escolher foto"}</label><input type="file" accept="image/*" id="pr-foto" hidden>` : ""}
    </div>
    ${n ? '<button type="button" class="btn ghost peq" id="pr-rosto-apagar" style="align-self:flex-start">Apagar dados do rosto</button>' : ""}</div>`;
}

function formProfessor(store, prof, pronto) {
  const p = prof || { nome: "", faixa: "preta", graus: 0 };
  const r = prof && rostoDe(store, prof.id), n = r?.descritores?.length || 0;
  const fichaAluno = p.alunoId ? store.dados.alunos.find(a => a.id === p.alunoId) : null;
  abrirFolha((el, fechar) => {
    el.innerHTML = `<h3>${prof ? "Editar professor" : "Novo professor"}</h3><form class="campos" novalidate>
      <div class="field cheio"><label for="pr-nome">Nome</label><input class="input" id="pr-nome" value="${esc(p.nome)}" autocomplete="off"></div>
      <div class="field"><label for="pr-faixa">Faixa</label><select class="input" id="pr-faixa">${opcoes(FAIXAS.map(f => [f, nomeFaixa(f)]), p.faixa)}</select></div>
      <div class="field"><label for="pr-graus">Graus</label><select class="input" id="pr-graus">${opcoes(["0", "1", "2", "3", "4", "5", "6"], String(p.graus))}</select></div>
      <div class="field cheio"><label class="check"><input type="checkbox" id="pr-treina"${fichaAluno ? " checked" : ""}> <b>Também treina</b> (fica como professor e aluno)</label>
        <small class="muted">${fichaAluno ? `Ficha de aluno: <a href="#aluno/${encodeURIComponent(fichaAluno.id)}">${esc(fichaAluno.nome)}</a>. A presença, a frequência e a graduação dele contam lá.`
          : "Desmarcado, ele aparece só como professor. Marcando, ganha uma ficha de aluno (sem mensalidade): na foto da aula aparece \"Treinou\" e a presença conta para a frequência e a graduação."}</small></div>
      ${store.modo === "painel" ? campoRostoProfessor(r) : ""}
      <p class="aviso cheio" id="pr-erro" hidden></p>
      <div class="acoes cheio"><button type="button" class="btn ghost" id="pr-x">Cancelar</button><button class="btn">${prof ? "Salvar" : "Cadastrar"}</button></div></form>`;
    el.querySelector("#pr-x").onclick = fechar;
    const foto = el.querySelector("#pr-foto");
    let urlPrevia = null;
    if (foto) foto.onchange = () => {
      const arq = foto.files?.[0], previa = el.querySelector("#pr-foto-previa");
      if (urlPrevia) URL.revokeObjectURL(urlPrevia);
      urlPrevia = arq && /^image\//.test(arq.type) ? URL.createObjectURL(arq) : null;
      if (urlPrevia) { previa.innerHTML = `<img src="${urlPrevia}" alt="">`; previa.classList.remove("vazio-mini"); }
      el.querySelector("#pr-foto-nome").textContent = arq ? "Foto escolhida (salva ao confirmar)" : n ? "Rosto cadastrado" : "Nenhuma foto escolhida";
      el.querySelector("#pr-foto-btn").textContent = arq ? "Trocar foto" : n ? "Adicionar foto" : "Escolher foto";
    };
    el.querySelector("#pr-rosto-apagar")?.addEventListener("click", async () => {
      if (!await perguntar("Apagar dados do rosto?", `Os números e a miniatura do Prof. ${prof.nome} saem do banco. A foto da aula deixa de reconhecer o professor.`, "Apagar", "Cancelar")) return;
      fechar();
      const { apagarRosto } = await import("../nuvem/dados.js");
      await salvarComAviso(apagarRosto(prof.id), "Dados do rosto apagados");
      pronto();
    });
    el.querySelector("form").onsubmit = e => {
      e.preventDefault();
      const nome = el.querySelector("#pr-nome").value.trim().replace(/\s+/g, " ");
      if (nome.length < 3) return erroEm(el, "#pr-erro", "Escreva o nome do professor.");
      const arq = foto?.files?.[0], problema = problemaNaFoto(arq);
      if (problema) return erroEm(el, "#pr-erro", problema);
      const campos = { nome, faixa: el.querySelector("#pr-faixa").value, graus: Number(el.querySelector("#pr-graus").value) };
      let alvo = prof;
      if (prof) Object.assign(prof, campos); else { alvo = { id: store.novoId("p"), ...campos }; store.dados.professores.push(alvo); }
      const ficha = professorTreina(store.dados, alvo, el.querySelector("#pr-treina").checked, { hoje: hojeISO(), novoId: px => store.novoId(px), real: store.modo === "painel" });
      const gravou = store.salvar(); fechar();
      toast(ficha.criado ? `${prof ? "Professor salvo" : "Professor cadastrado"} · ficha de aluno criada` : prof ? "Professor salvo" : "Professor cadastrado"); pronto();
      // O rosto só é aceito pelo banco depois que o professor já está gravado.
      if (arq && gravou !== false) Promise.resolve(store.gravando).then(ok => ok !== false && import("./rosto.js").then(m => m.cadastrarFotoRosto(store, alvo, arq)));
    };
  });
}

export const professores = {
  titulo: "Professores",
  montar(el, params, ctx) {
    const { store } = ctx, d = store.dados, hoje = hojeISO(), desde = somarDias(hoje, -30);
    el.innerHTML = cabecalho("Professores", "Equipe técnica, turmas e alunos atendidos.", `<button class="btn" id="novo">${icone("professores")}Novo professor</button>`) +
      `<div class="grade3">${d.professores.map(p => {
        const turmas = d.turmas.filter(t => t.professorId === p.id).sort((a, b) => a.diaSemana - b.diaSemana || a.horario.localeCompare(b.horario));
        const ids = new Set(turmas.map(t => t.id));
        const cks = d.checkins.filter(c => ids.has(c.turmaId) && c.data > desde);
        const alunosUnicos = new Set(cks.map(c => c.alunoId)).size;
        const r = rostoDe(store, p.id);
        return `<div class="card" style="display:flex;flex-direction:column;gap:12px">
          <div class="pessoa">${r?.mini ? `<img class="av" src="${esc(r.mini)}" alt="" style="object-fit:cover">` : `<span class="av">${esc(iniciais(p.nome))}</span>`}<div><b>Prof. ${esc(p.nome)}</b><small>${nomeFaixa(p.faixa)}${p.graus ? ` · ${p.graus}º grau` : ""}${store.modo === "painel" ? ` · ${r?.descritores?.length ? "rosto cadastrado" : "sem foto do rosto"}` : ""}</small></div></div>
          ${faixaSVG(p.faixa === "preta" ? "preta" : p.faixa, Math.min(4, p.graus))}
          <div class="dados" style="grid-template-columns:repeat(3,1fr)"><div><small>Turmas</small><b>${turmas.length}</b></div><div><small>Alunos 30d</small><b>${alunosUnicos}</b></div><div><small>Presenças 30d</small><b>${cks.length}</b></div></div>
          <div class="chips">${turmas.length ? turmas.map(t => `<span class="chip">${DIAS_CURTOS[t.diaSemana]} ${horaTexto(t.horario)}</span>`).join("") : '<span class="muted" style="font-size:12px">Sem turmas</span>'}</div>
          <div style="display:flex;gap:8px"><button class="btn sec peq" data-editar="${esc(p.id)}">${store.modo === "painel" ? "Editar e foto" : "Editar"}</button>${turmas.length ? "" : `<button class="btn sec peq" data-excluir="${esc(p.id)}">Excluir</button>`}</div>
        </div>`;
      }).join("")}</div>`;
    el.querySelector("#novo").onclick = () => formProfessor(store, null, ctx.redesenhar);
    el.querySelectorAll("[data-editar]").forEach(b => b.onclick = () => formProfessor(store, d.professores.find(p => p.id === b.dataset.editar), ctx.redesenhar));
    el.querySelectorAll("[data-excluir]").forEach(b => b.onclick = async () => {
      if (!await perguntar("Excluir professor?", "Ele não tem turmas, então pode sair da equipe. O rosto dele, se tiver, também sai do banco.", "Excluir", "Cancelar")) return;
      const id = b.dataset.excluir, tinhaRosto = !!rostoDe(store, id);
      d.professores = d.professores.filter(p => p.id !== id);
      if (store.salvar() === false) return;
      if (tinhaRosto) import("../nuvem/dados.js").then(m => m.apagarRosto(id)).catch(e => console.error(e));
      toast("Professor excluído"); ctx.redesenhar();
    });
  }
};

// ---------- Acompanhamentos ----------
const TIPOS_NOTA = ["Contato", "Técnico", "Graduação", "Saúde", "Financeiro"];
const estadoAc = { aba: "Sumidos" };

function formNota(store, aluno, pronto) {
  abrirFolha((el, fechar) => {
    el.innerHTML = `<h3>Anotação</h3><p class="muted" style="margin:0">${esc(aluno.nome)}</p><form class="campos" novalidate>
      <div class="field cheio"><label for="n-tipo">Tipo</label><select class="input" id="n-tipo">${opcoes(TIPOS_NOTA, "Contato")}</select></div>
      <div class="field cheio"><label for="n-txt">O que aconteceu</label><textarea class="input" id="n-txt" rows="3" placeholder="Ex.: liguei, está machucado, volta semana que vem"></textarea></div>
      <p class="aviso cheio" id="n-erro" hidden></p>
      <div class="acoes cheio"><button type="button" class="btn ghost" id="n-x">Cancelar</button><button class="btn">Salvar</button></div></form>`;
    el.querySelector("#n-x").onclick = fechar;
    el.querySelector("#n-txt").focus();
    el.querySelector("form").onsubmit = e => {
      e.preventDefault();
      const texto = el.querySelector("#n-txt").value.trim();
      if (texto.length < 3) return erroEm(el, "#n-erro", "Escreva a anotação.");
      store.dados.acompanhamentos.unshift({ id: store.novoId("ac"), alunoId: aluno.id, data: hojeISO(), tipo: el.querySelector("#n-tipo").value, texto });
      store.salvar(); fechar(); toast("Anotação salva"); pronto();
    };
  });
}

export function ultimoTreino(alunoId, checkins) {
  let ult = null;
  for (const c of checkins) if (c.alunoId === alunoId && (!ult || c.data > ult)) ult = c.data;
  return ult;
}

export const acompanhamentos = {
  titulo: "Acompanhamentos",
  montar(el, params, ctx) {
    const { store } = ctx, d = store.dados, hoje = hojeISO(), alunos = porId(d.alunos);
    const ativos = d.alunos.filter(a => a.status === "ativo" && daAba(a));
    const info = ativos.map(a => ({ a, ult: ultimoTreino(a.id, d.checkins), n30: aulas30(a.id, d.checkins, hoje), apt: aptidao(a, d.checkins, hoje) }));
    const grupos = {
      Sumidos: info.filter(x => (x.ult ? diasEntre(x.ult, hoje) : diasEntre(x.a.desde, hoje)) >= 14).sort((x, y) => (x.ult || "").localeCompare(y.ult || "")),
      "Frequência baixa": info.filter(x => x.n30 >= 1 && x.n30 <= 4 && x.ult && diasEntre(x.ult, hoje) < 14).sort((x, y) => x.n30 - y.n30),
      "Novos (30 dias)": info.filter(x => diasEntre(x.a.desde, hoje) <= 30),
      "Aptos a graduar": info.filter(x => x.apt.tipo)
    };
    const motivo = x => estadoAc.aba === "Sumidos" ? (x.ult ? `sem treinar há ${diasEntre(x.ult, hoje)} dias` : "nunca treinou")
      : estadoAc.aba === "Frequência baixa" ? `${x.n30} aula${x.n30 === 1 ? "" : "s"} em 30 dias`
      : estadoAc.aba === "Novos (30 dias)" ? `entrou em ${dataLonga(x.a.desde)} · ${x.n30} aulas`
      : x.apt.tipo === "faixa" ? `apto à faixa ${nomeFaixa(x.apt.proximaFaixa).toLowerCase()}` : `apto ao ${x.a.graus + 1}º grau`;
    const notas = d.acompanhamentos.filter(n => alunos[n.alunoId] && daAba(alunos[n.alunoId]));
    const lista = estadoAc.aba === "Anotações"
      ? (notas.length ? `<div class="lista">${notas.map(n => `<div><span class="pill info">${esc(n.tipo)}</span><div class="cresce"><b>${esc(alunos[n.alunoId]?.nome || "Aluno removido")}</b><small>${esc(n.texto)}</small></div><span class="muted" style="white-space:nowrap">${dataLonga(n.data)}</span></div>`).join("")}</div>` : `<div class="vazio">Nenhuma anotação ainda.</div>`)
      : (grupos[estadoAc.aba].length ? `<div class="lista">${grupos[estadoAc.aba].map(x => `<div><a href="#aluno/${encodeURIComponent(x.a.id)}" class="cresce">${pessoa(x.a, motivo(x))}</a>
          <span class="muted" style="font-size:12px">${notas.filter(n => n.alunoId === x.a.id).length || ""}</span>
          <button class="btn sec peq" data-anotar="${esc(x.a.id)}">Anotar</button></div>`).join("")}</div>` : `<div class="vazio">Ninguém nesta lista. 👏</div>`);
    el.innerHTML = cabecalho("Acompanhamentos", "Quem precisa de atenção agora, com anotações da equipe.") + abasCategoria(d) +
      `<div class="kpis">${Object.entries(grupos).map(([nome, l]) => `<button class="kpi${nome === estadoAc.aba ? " destaque" : ""}" data-aba="${nome}" style="text-align:left"><div class="kpi-top"><span>${nome}</span></div><b>${l.length}</b><small>alunos</small></button>`).join("")}</div>
      <div class="chips">${[...Object.keys(grupos), "Anotações"].map(t => `<button class="chip${estadoAc.aba === t ? " on" : ""}" data-aba="${t}">${t}${t === "Anotações" ? ` · ${notas.length}` : ""}</button>`).join("")}</div>
      <div class="card">${lista}</div>`;
    ligarAbas(el, ctx);
    el.querySelectorAll("[data-aba]").forEach(b => b.onclick = () => { estadoAc.aba = b.dataset.aba; ctx.redesenhar(); });
    el.querySelectorAll("[data-anotar]").forEach(b => b.onclick = () => formNota(store, alunos[b.dataset.anotar], ctx.redesenhar));
  }
};

// ---------- Cronogramas ----------
const estadoCr = { programa: "GB1" };

const linhasTecnicas = tecnicas => (tecnicas || []).map(t => t.categoria ? `${t.nome} | ${t.categoria}` : t.nome).join("\n");
const lerTecnicas = texto => texto.split("\n").map(l => l.split("|")).filter(p => p[0].trim())
  .map(([nome, categoria]) => ({ nome: nome.trim().slice(0, 200), categoria: String(categoria || "").trim().slice(0, 40) }));

function formSemana(store, s, pronto) {
  abrirFolha((f, fechar) => {
    const bloco = (letra, a) => `<div class="secao">Aula ${letra} <small class="muted" style="text-transform:none;letter-spacing:0;font-weight:600">${letra === "A" ? "segunda e terça" : "quarta e quinta"}</small></div>
      <div class="field cheio"><label for="c-tema${letra}">Tema da aula ${letra}</label><input class="input" id="c-tema${letra}" value="${esc(a?.tema || "")}"></div>
      <div class="field cheio"><label for="c-tec${letra}">Técnicas (uma por linha; opcional: técnica | posição)</label><textarea class="input" id="c-tec${letra}" rows="4">${esc(linhasTecnicas(a?.tecnicas))}</textarea></div>`;
    f.innerHTML = `<h3>${esc(s.programa)} · semana ${s.semana}</h3><form class="campos" novalidate>
      ${bloco("A", s.aulaA)}${bloco("B", s.aulaB)}
      <p class="aviso cheio" id="c-erro" hidden></p>
      <div class="acoes cheio"><button type="button" class="btn ghost" id="c-x">Cancelar</button><button class="btn">Salvar</button></div></form>`;
    f.querySelector("#c-x").onclick = fechar;
    f.querySelector("form").onsubmit = e => {
      e.preventDefault();
      const tA = f.querySelector("#c-temaA").value.trim(), tB = f.querySelector("#c-temaB").value.trim();
      if (!tA && !tB) return erroEm(f, "#c-erro", "Escreva o tema de pelo menos uma das aulas.");
      s.aulaA = { tema: tA, tecnicas: lerTecnicas(f.querySelector("#c-tecA").value) };
      s.aulaB = { tema: tB, tecnicas: lerTecnicas(f.querySelector("#c-tecB").value) };
      store.salvar(); fechar(); toast("Semana salva"); pronto();
    };
  });
}

export const cronogramas = {
  titulo: "Cronogramas",
  montar(el, params, ctx) {
    const { store } = ctx, d = store.dados, hoje = hojeISO(), prog = estadoCr.programa;
    const ref = diaDeReferencia(hoje), atual = semanaDoCiclo(ref, d.config.ancoras, prog), segunda = segundaDaSemana(ref);
    const inicioDa = n => somarDias(segunda, 7 * ((((n - atual) % CICLO_SEMANAS) + CICLO_SEMANAS) % CICLO_SEMANAS));
    const semanas = d.cronograma.filter(s => s.programa === prog).sort((a, b) => a.semana - b.semana);
    const fmt = iso => `${iso.slice(8)}/${iso.slice(5, 7)}`;
    const resumo = a => a?.tema ? `<b>${esc(a.tema)}</b>${a.tecnicas?.length ? `<small>${a.tecnicas.length} técnica${a.tecnicas.length === 1 ? "" : "s"}: ${esc(a.tecnicas.slice(0, 3).map(t => t.nome).join(" · "))}${a.tecnicas.length > 3 ? "…" : ""}</small>` : ""}` : '<small class="muted">—</small>';
    el.innerHTML = cabecalho("Cronogramas", "O que o professor dá em cada semana do ciclo: Aula A (seg/ter) e Aula B (qua/qui); sexta e sábado revisam as duas.",
      `<label class="btn sec" style="cursor:pointer">${icone("documentos")}Importar currículo (JSON)<input type="file" id="importar-cur" accept="application/json,.json" hidden></label>
       <button class="btn sec" id="ajustar">${icone("agenda")}Ajustar semana atual</button>`) +
      `<div class="chips">${["GB1", "GB2"].map(p => `<button class="chip${p === prog ? " on" : ""}" data-p="${p}">${p} · semana ${semanaDoCiclo(ref, d.config.ancoras, p)}</button>`).join("")}</div>
      <div class="card"><table class="tabela resp cronograma"><thead><tr><th>Semana</th><th>Aula A · seg/ter</th><th>Aula B · qua/qui</th><th>Quando</th><th></th></tr></thead><tbody>${semanas.map(s => {
        const ini = inicioDa(s.semana);
        return `<tr${s.semana === atual ? ' class="atual"' : ""}><td><b>${s.semana === atual ? "▶ " : ""}Semana ${s.semana}</b></td>
          <td class="cheia" data-l="A:">${resumo(s.aulaA)}</td><td class="cheia" data-l="B:">${resumo(s.aulaB)}</td>
          <td data-l="Quando:">${s.semana === atual ? "esta semana" : `${fmt(ini)} a ${fmt(somarDias(ini, 5))}`}</td>
          <td class="num"><button class="btn sec peq" data-editar="${esc(s.id)}">Editar</button></td></tr>`;
      }).join("")}</tbody></table></div>`;
    el.querySelectorAll("[data-p]").forEach(b => b.onclick = () => { estadoCr.programa = b.dataset.p; ctx.redesenhar(); });
    el.querySelectorAll("[data-editar]").forEach(b => b.onclick = () => formSemana(store, d.cronograma.find(x => x.id === b.dataset.editar), ctx.redesenhar));
    el.querySelector("#importar-cur").onchange = async e => {
      const arq = e.target.files?.[0]; e.target.value = "";
      if (!arq) return;
      let semanasNovas;
      try { semanasNovas = lerCurriculo(await arq.text()); } catch (err) { toast(err.message); return; }
      const progs = [...new Set(semanasNovas.map(s => s.programa))];
      if (!await perguntar("Importar currículo?", `${semanasNovas.length} semana(s) de ${progs.join(" e ")} vão substituir o que está no cronograma dessas semanas. Os temas de exemplo que ainda estiverem no cronograma (de qualquer programa) saem; o que foi cadastrado à mão fica.`, "Importar", "Cancelar")) return;
      const antes = d.cronograma;
      d.cronograma = aplicarCurriculo(d.cronograma, semanasNovas);
      if (!store.salvar()) { d.cronograma = antes; toast("Sem espaço no navegador para salvar o currículo."); return; }
      toast(`Currículo importado: ${semanasNovas.length} semana(s)`); ctx.redesenhar();
    };
    el.querySelector("#ajustar").onclick = () => abrirFolha((f, fechar) => {
      f.innerHTML = `<h3>Em que semana o ${prog} está?</h3><p class="muted" style="margin:0">Vale a partir desta semana (${fmt(segunda)}).</p>
        <div class="chips">${Array.from({ length: 16 }, (_, i) => `<button class="chip${i + 1 === atual ? " on" : ""}" data-s="${i + 1}">${i + 1}</button>`).join("")}</div>
        <button class="btn ghost bloco" id="a-x">Cancelar</button>`;
      f.querySelector("#a-x").onclick = fechar;
      f.querySelectorAll("[data-s]").forEach(c => c.onclick = () => {
        d.config.ancoras = [...d.config.ancoras.filter(a => !(a.programa === prog && a.data === segunda)), { programa: prog, data: segunda, semana: Number(c.dataset.s) }];
        store.salvar(); fechar(); toast(`${prog} na semana ${c.dataset.s}`); ctx.redesenhar();
      });
    });
  }
};

// ---------- Modelos de aula ----------
function formModeloAula(store, m, pronto) {
  const x = m || { nome: "", publico: "GB1", blocos: [{ nome: "Aquecimento", min: 10 }, { nome: "Técnica", min: 20 }, { nome: "Rola", min: 20 }] };
  abrirFolha((el, fechar) => {
    el.innerHTML = `<h3>${m ? "Editar modelo" : "Novo modelo de aula"}</h3><form class="campos" novalidate>
      <div class="field cheio"><label for="m-nome">Nome</label><input class="input" id="m-nome" value="${esc(x.nome)}"></div>
      <div class="field cheio"><label for="m-pub">Turma</label><select class="input" id="m-pub">${opcoes(["GB1", "GB2", "GB1+GB2"], x.publico)}</select></div>
      <div class="field cheio"><label for="m-blocos">Blocos (um por linha: nome | minutos)</label><textarea class="input" id="m-blocos" rows="6">${esc(x.blocos.map(b => `${b.nome} | ${b.min}`).join("\n"))}</textarea></div>
      <p class="aviso cheio" id="m-erro" hidden></p>
      <div class="acoes cheio"><button type="button" class="btn ghost" id="m-x">Cancelar</button><button class="btn">Salvar</button></div>
      ${m ? '<button type="button" class="link cheio" id="m-del" style="justify-self:center">Excluir modelo</button>' : ""}</form>`;
    el.querySelector("#m-x").onclick = fechar;
    el.querySelector("#m-del")?.addEventListener("click", async () => {
      fechar();
      if (!await perguntar("Excluir modelo de aula?", m.nome, "Excluir", "Cancelar")) return;
      store.dados.modelosAula = store.dados.modelosAula.filter(y => y !== m); store.salvar(); fechar(); toast("Modelo excluído"); pronto();
    });
    el.querySelector("form").onsubmit = e => {
      e.preventDefault();
      const nome = el.querySelector("#m-nome").value.trim();
      const blocos = el.querySelector("#m-blocos").value.split("\n").map(l => l.split("|")).filter(p => p[0].trim())
        .map(([n, min]) => ({ nome: n.trim(), min: Math.round(Number(String(min ?? "").replace(",", "."))) }));
      if (nome.length < 3) return erroEm(el, "#m-erro", "Dê um nome ao modelo.");
      if (!blocos.length || blocos.some(b => !(b.min > 0 && b.min <= 120))) return erroEm(el, "#m-erro", "Cada bloco precisa de nome e minutos (1 a 120), ex.: Aquecimento | 10");
      const campos = { nome, publico: el.querySelector("#m-pub").value, blocos };
      if (m) Object.assign(m, campos); else store.dados.modelosAula.push({ id: store.novoId("ma"), ...campos });
      store.salvar(); fechar(); toast("Modelo salvo"); pronto();
    };
  });
}

const CORES_BLOCO = ["#e10b16", "#2449c9", "#6b2fa8", "#1f8a5b", "#d98a16", "#151517"];
export const modelosAula = {
  titulo: "Modelos de aula",
  montar(el, params, ctx) {
    const { store } = ctx, d = store.dados;
    el.innerHTML = cabecalho("Modelos de aula", "Como cada aula é dividida, do aquecimento ao rola.", `<button class="btn" id="novo">${icone("modelos-aula")}Novo modelo</button>`) +
      (d.modelosAula.length ? `<div class="grade2">${d.modelosAula.map(m => {
        const total = m.blocos.reduce((s, b) => s + b.min, 0);
        return `<div class="card" style="display:flex;flex-direction:column;gap:12px"><div class="card-cab" style="margin:0"><div><h3>${esc(m.nome)}</h3><small>${total} minutos</small></div>${etiquetaPrograma(m.publico)}</div>
          <div style="display:flex;height:14px;border-radius:7px;overflow:hidden">${m.blocos.map((b, i) => `<i title="${esc(b.nome)}" style="width:${b.min / total * 100}%;background:${CORES_BLOCO[i % CORES_BLOCO.length]}"></i>`).join("")}</div>
          <div class="lista">${m.blocos.map((b, i) => `<div><span class="bolinha" style="width:10px;height:10px;border-radius:50%;background:${CORES_BLOCO[i % CORES_BLOCO.length]}"></span><div class="cresce"><b>${esc(b.nome)}</b></div><span class="muted">${b.min} min</span></div>`).join("")}</div>
          <button class="btn sec peq" data-editar="${esc(m.id)}" style="align-self:flex-start">Editar</button></div>`;
      }).join("")}</div>` : `<div class="card vazio">Nenhum modelo ainda.</div>`);
    el.querySelector("#novo").onclick = () => formModeloAula(store, null, ctx.redesenhar);
    el.querySelectorAll("[data-editar]").forEach(b => b.onclick = () => formModeloAula(store, d.modelosAula.find(m => m.id === b.dataset.editar), ctx.redesenhar));
  }
};

// ---------- Habilidades ----------
const NIVEIS = ["Iniciante", "Intermediário", "Avançado"];
const estadoHab = { cat: null };

function formHabilidade(store, h, pronto) {
  const x = h || { nome: "", categoria: CATEGORIAS_TECNICAS[0], nivel: "Iniciante", faixaMin: "branca" };
  abrirFolha((el, fechar) => {
    el.innerHTML = `<h3>${h ? "Editar habilidade" : "Nova habilidade"}</h3><form class="campos" novalidate>
      <div class="field cheio"><label for="h-nome">Habilidade</label><input class="input" id="h-nome" value="${esc(x.nome)}"></div>
      <div class="field"><label for="h-cat">Posição</label><select class="input" id="h-cat">${opcoes(CATEGORIAS_TECNICAS, x.categoria)}</select></div>
      <div class="field"><label for="h-niv">Nível</label><select class="input" id="h-niv">${opcoes(NIVEIS, x.nivel)}</select></div>
      <div class="field cheio"><label for="h-fx">A partir da faixa</label><select class="input" id="h-fx">${opcoes(FAIXAS.map(f => [f, nomeFaixa(f)]), x.faixaMin)}</select></div>
      <p class="aviso cheio" id="h-erro" hidden></p>
      <div class="acoes cheio"><button type="button" class="btn ghost" id="h-x">Cancelar</button><button class="btn">Salvar</button></div>
      ${h ? '<button type="button" class="link cheio" id="h-del" style="justify-self:center">Excluir habilidade</button>' : ""}</form>`;
    el.querySelector("#h-x").onclick = fechar;
    el.querySelector("#h-del")?.addEventListener("click", async () => { fechar(); if (!await perguntar("Excluir habilidade?", h.nome, "Excluir", "Cancelar")) return; store.dados.habilidades = store.dados.habilidades.filter(y => y !== h); store.salvar(); fechar(); toast("Habilidade excluída"); pronto(); });
    el.querySelector("form").onsubmit = e => {
      e.preventDefault();
      const nome = el.querySelector("#h-nome").value.trim();
      if (nome.length < 3) return erroEm(el, "#h-erro", "Escreva o nome da habilidade.");
      const campos = { nome, categoria: el.querySelector("#h-cat").value, nivel: el.querySelector("#h-niv").value, faixaMin: el.querySelector("#h-fx").value };
      if (h) Object.assign(h, campos); else store.dados.habilidades.push({ id: store.novoId("h"), ...campos });
      store.salvar(); fechar(); toast("Habilidade salva"); pronto();
    };
  });
}

export const habilidades = {
  titulo: "Habilidades",
  montar(el, params, ctx) {
    const { store } = ctx, d = store.dados;
    const lista = d.habilidades.filter(h => !estadoHab.cat || h.categoria === estadoHab.cat)
      .sort((a, b) => FAIXAS.indexOf(a.faixaMin) - FAIXAS.indexOf(b.faixaMin) || a.nome.localeCompare(b.nome, "pt-BR"));
    const pill = n => `<span class="pill ${n === "Iniciante" ? "ok" : n === "Intermediário" ? "info" : "alerta"}">${esc(n)}</span>`;
    el.innerHTML = cabecalho("Habilidades", "O que se espera em cada posição e a partir de qual faixa.", `<button class="btn" id="novo">${icone("habilidades")}Nova habilidade</button>`) +
      `<details class="card regras27"><summary><b>Regras CBJJ/IBJJF 2027 que mudam o treino</b> <span class="pill alerta">a partir de 01/01/2027</span></summary>
        <ul>
          <li><b>Pular na guarda</b> vira falta gravíssima (desclassificação) para <b>até 15 anos</b> e para <b>faixa branca</b> em qualquer idade.</li>
          <li><b>Chave de pé reta</b> proibida para <b>juvenis (16 e 17 anos)</b> e <b>faixa branca</b>. Azul e roxa podem girar para o lado do pé não atacado.</li>
          <li><b>Puxada dupla:</b> 20 segundos sem ninguém ir por cima ou pontuar, a luta recomeça em pé.</li>
          <li><b>Pegada de lapela/faixa enrolada na própria perna:</b> 20 segundos para progredir, senão falta de combatividade.</li>
          <li><b>Queda na puxada para guarda:</b> deixa de existir a contagem de 3 segundos com o oponente de costas.</li>
          <li><b>Master 8</b> (66 anos ou mais), com luta de 4 minutos; Master 7 passa a ser de 61 a 65 anos.</li>
        </ul>
        <small class="muted">Resumo da página de mudanças de regras da CBJJ. Em caso de dúvida, vale o livro de regras oficial.</small>
      </details>` +
      `<div class="chips">${CATEGORIAS_TECNICAS.map(c => `<button class="chip${estadoHab.cat === c ? " on" : ""}" data-c="${esc(c)}">${esc(c)} · ${d.habilidades.filter(h => h.categoria === c).length}</button>`).join("")}</div>
      <div class="card">${lista.length ? `<table class="tabela resp"><thead><tr><th>Habilidade</th><th>Posição</th><th>Nível</th><th>A partir da</th></tr></thead><tbody>${lista.map(h =>
        `<tr class="clica" data-id="${esc(h.id)}" tabindex="0"><td class="cheia"><b>${esc(h.nome)}</b></td><td>${esc(h.categoria)}</td><td>${pill(h.nivel)}</td><td>${faixaCelula({ faixa: h.faixaMin, graus: 0 })}</td></tr>`).join("")}</tbody></table>`
        : `<div class="vazio">Nenhuma habilidade nesta posição.</div>`}</div>`;
    el.querySelectorAll("[data-c]").forEach(b => b.onclick = () => { estadoHab.cat = estadoHab.cat === b.dataset.c ? null : b.dataset.c; ctx.redesenhar(); });
    el.querySelector("#novo").onclick = () => formHabilidade(store, null, ctx.redesenhar);
    el.querySelectorAll("tr[data-id]").forEach(tr => { const abrir = () => formHabilidade(store, d.habilidades.find(h => h.id === tr.dataset.id), ctx.redesenhar); tr.onclick = abrir; tr.onkeydown = e => { if (e.key === "Enter") abrir(); }; });
  }
};
