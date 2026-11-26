// Alunos: abas Adultos | Kids, busca, filtros, tabela (cartões no celular), cadastro e exportação CSV.
import { problemaNaFoto } from "../logica/cadastro-rosto.js";
import { esc, abrirFolha, toast, dataLonga } from "../ui/util.js";
import { normalizar, csv } from "../ui/util-admin.js";
import { faixasDe, nomeFaixa, CORES_FAIXA } from "../ui/faixa.js";
import { hojeISO, somarDias, dataValida } from "../logica/datas.js";
import { inadimplentes } from "../logica/financeiro.js";
import { idadeEm } from "../logica/graduacao.js";
import { irmaos, valorComDesconto } from "../logica/familia.js";
import { telefoneValido } from "../logica/regras-cadastro.js";
import { problemaNoEmail, emailValido } from "../logica/portal.js";
import { icone } from "../menu.js";
import { cabecalho, pessoa, faixaCelula, PILL_STATUS, aba, definirAba, daAba, abasCategoria, ligarAbas, anosTexto } from "./comum.js";

const estado = { busca: "", status: "Todos", faixa: null };

export function aulas30(alunoId, checkins, hoje) {
  const desde = somarDias(hoje, -30);
  return checkins.filter(c => c.alunoId === alunoId && c.data > desde && c.data <= hoje).length;
}

// Folha de cadastro/edição. aluno = null cria um novo (na categoria da aba aberta, ou inicial.categoria).
export function abrirFormAluno(store, aluno, aoSalvar, inicial = {}) {
  const hoje = hojeISO(), novo = !aluno;
  const categoria = aluno?.categoria || inicial.categoria || aba(), kids = categoria === "kids";
  const planos = store.dados.planos.filter(p => (p.ativo || p.id === aluno?.plano) && (p.id === "Kids") === kids);
  const a = aluno || { sexo: "M", faixa: "branca", graus: 0, plano: planos[0]?.id, autorizaImagem: true, ...inicial };
  const r = a.responsavel || {};
  const sel = (id, nome, lista, atual) => `<select class="input" id="${id}" name="${nome}">${lista.map(([v, t]) => `<option value="${esc(v)}"${v === atual ? " selected" : ""}>${esc(t)}</option>`).join("")}</select>`;
  abrirFolha((el, fechar) => {
    el.innerHTML = `<h3>${novo ? (kids ? "Nova criança" : "Novo aluno") : "Editar aluno"} ${kids ? '<span class="tag kids">Kids</span>' : ""}</h3>
      <form class="campos" novalidate>
        <div class="field cheio"><label for="f-nome">Nome completo${kids ? " da criança" : ""}</label><input class="input" id="f-nome" name="nome" value="${esc(a.nome || "")}" autocomplete="off"></div>
        <div class="field"><label for="f-sexo">Sexo</label>${sel("f-sexo", "sexo", [["M", "Masculino"], ["F", "Feminino"]], a.sexo)}</div>
        <div class="field"><label for="f-nasc">Nascimento</label><input class="input" type="date" id="f-nasc" name="nascimento" value="${esc(a.nascimento || "")}" max="${hoje}"></div>
        <div class="field"><label for="f-peso">Peso (kg)</label><input class="input" type="number" inputmode="decimal" step="0.1" min="${kids ? 10 : 20}" max="250" id="f-peso" name="peso" value="${esc(a.peso ?? "")}"></div>
        ${kids ? "" : `<div class="field"><label for="f-tel">Telefone</label><input class="input" id="f-tel" name="telefone" value="${esc(a.telefone || "")}" inputmode="tel"></div>
        <div class="field cheio"><label for="f-email">E-mail <small class="muted">(é o login dele no portal do aluno)</small></label><input class="input" type="email" id="f-email" name="email" value="${esc(a.emailPortal || "")}" autocomplete="off" inputmode="email" autocapitalize="none" spellcheck="false" placeholder="Opcional"></div>`}
        ${novo ? `<div class="field"><label for="f-faixa">Faixa</label>${sel("f-faixa", "faixa", faixasDe(categoria).map(f => [f, nomeFaixa(f)]), a.faixa)}</div>
        <div class="field"><label for="f-graus">Graus</label>${sel("f-graus", "graus", [0, 1, 2, 3, 4].map(g => [String(g), String(g)]), String(a.graus))}</div>` : ""}
        <div class="field cheio"><label for="f-plano">Plano</label>${sel("f-plano", "plano", planos.map(p => [p.id, `${p.nome} · R$ ${p.valor}`]), a.plano)}</div>
        ${kids ? `<div class="secao">Responsável</div>
        <div class="field"><label for="f-rnome">Nome do responsável</label><input class="input" id="f-rnome" name="rnome" value="${esc(r.nome || "")}" autocomplete="off"></div>
        <div class="field"><label for="f-rpar">Parentesco</label>${sel("f-rpar", "rparentesco", ["mãe", "pai", "avó", "avô", "tia", "tio", "outro"].map(x => [x, x[0].toUpperCase() + x.slice(1)]), r.parentesco || "mãe")}</div>
        <div class="field"><label for="f-rtel">Telefone do responsável</label><input class="input" id="f-rtel" name="rtelefone" value="${esc(r.telefone || "")}" inputmode="tel"></div>
        <div class="field"><label for="f-rbusca">Quem pode buscar</label><input class="input" id="f-rbusca" name="rbuscam" value="${esc(r.buscam || "")}" placeholder="Ex.: pai, mãe e avó"></div>
        <div class="secao">Saúde e autorizações</div>
        <div class="field cheio"><label for="f-saude">Alergias e observações</label><input class="input" id="f-saude" name="saude" value="${esc(a.saude || "")}" placeholder="Ex.: alergia a amendoim"></div>
        <label class="check cheio"><input type="checkbox" name="autorizaImagem"${a.autorizaImagem ? " checked" : ""}> Autoriza uso de imagem em fotos e vídeos da academia</label>` : ""}
        ${novo && store.modo === "painel" ? `<div class="field cheio" id="f-foto-campo"><span class="rotulo">Foto do rosto (opcional)</span>
          <div class="foto-escolha">
            <span class="rosto-mini vazio-mini" id="f-foto-previa" aria-hidden="true">${icone("alunos")}</span>
            <div class="cresce"><b id="f-foto-nome">Nenhuma foto escolhida</b><small class="muted">De frente, só a pessoa. Depois de salvar, pede a autorização.</small></div>
            <label class="btn sec peq" for="f-foto" id="f-foto-btn">Escolher foto</label>
            <input type="file" accept="image/*" id="f-foto" hidden>
          </div></div>` : ""}
        <p class="aviso cheio" id="f-erro" hidden></p>
        <div class="acoes cheio"><button type="button" class="btn ghost" id="f-cancelar">Cancelar</button><button class="btn" type="submit">${novo ? "Cadastrar" : "Salvar"}</button></div>
      </form>`;
    const form = el.querySelector("form"), erro = el.querySelector("#f-erro");
    el.querySelector("#f-cancelar").onclick = fechar;
    el.querySelector("#f-nome").focus();
    const foto = el.querySelector("#f-foto");
    // Mostra a foto escolhida em miniatura (só na tela; quem grava é o cadastro do rosto).
    let urlPrevia = null;
    if (foto) foto.onchange = () => {
      const arq = foto.files?.[0], previa = el.querySelector("#f-foto-previa");
      if (urlPrevia) URL.revokeObjectURL(urlPrevia);
      urlPrevia = arq && /^image\//.test(arq.type) ? URL.createObjectURL(arq) : null;
      previa.innerHTML = urlPrevia ? `<img src="${urlPrevia}" alt="">` : icone("alunos");
      previa.classList.toggle("vazio-mini", !urlPrevia);
      el.querySelector("#f-foto-nome").textContent = arq ? "Foto escolhida" : "Nenhuma foto escolhida";
      el.querySelector("#f-foto-btn").textContent = arq ? "Trocar foto" : "Escolher foto";
    };
    form.onsubmit = e => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(form));
      const nome = f.nome.trim().replace(/\s+/g, " ");
      const idade = f.nascimento && dataValida(f.nascimento) ? idadeEm(f.nascimento, hoje) : null;
      const falha = nome.length < 3 ? "Escreva o nome completo."
        : f.nascimento && (!dataValida(f.nascimento) || f.nascimento > hoje) ? "Data de nascimento inválida."
        : kids && !f.nascimento ? "Informe a data de nascimento da criança."
        : kids && novo && (idade < 3 || idade > 17) ? "Kids é para crianças de 3 a 17 anos."
        : f.peso && !(Number(f.peso) >= (kids ? 10 : 20) && Number(f.peso) <= 250) ? "Peso fora do esperado."
        : kids && (f.rnome || "").trim().length < 3 ? "Escreva o nome do responsável."
        : kids && (f.rtelefone || "").replace(/\D/g, "").length < 8 ? "Informe o telefone do responsável."
        : !telefoneValido(kids ? f.rtelefone : f.telefone) ? "Confira o telefone: só números, com DDD (8 a 13 dígitos)."
        : !kids && problemaNoEmail(f.email, aluno?.id || null, store.dados.alunos) ? problemaNoEmail(f.email, aluno?.id || null, store.dados.alunos)
        : foto ? problemaNaFoto(foto.files?.[0]) : "";
      if (falha) { erro.textContent = falha; erro.hidden = false; return; }
      const campos = { nome, sexo: f.sexo, nascimento: f.nascimento || "", peso: f.peso ? Number(f.peso) : null, plano: f.plano,
        valor: !novo && aluno.plano === f.plano ? aluno.valor : (planos.find(p => p.id === f.plano)?.valor ?? 0) };
      if (kids) Object.assign(campos, {
        telefone: f.rtelefone.trim(), saude: f.saude.trim(), autorizaImagem: !!f.autorizaImagem,
        responsavel: { nome: f.rnome.trim(), parentesco: f.rparentesco, telefone: f.rtelefone.trim(), buscam: f.rbuscam.trim() }
      });
      else {
        campos.telefone = (f.telefone || "").trim();
        // E-mail = login no portal do aluno: preenchido, o acesso é liberado (o espelho grava acessos/{email}).
        const email = emailValido(f.email);
        if (email) campos.emailPortal = email; else if (aluno) delete aluno.emailPortal;
      }
      const d = store.dados;
      let alvo = aluno;
      if (novo) {
        const graus = Number(f.graus) || 0;
        alvo = { id: store.novoId(kids ? "k" : "a"), categoria, ...campos, faixa: f.faixa, graus, desde: hoje, desdeFaixa: hoje, ultimaGraduacao: hoje, status: "ativo", vencimentoDia: d.config.vencimentoPadrao || 10 };
        // No painel logado todo aluno novo é real (vai para o banco); a etiqueta "Real" o separa dos de exemplo.
        if (store.modo === "painel") alvo.real = true;
        const manos = irmaos(alvo, d.alunos);
        if (manos.length) { alvo.valor = valorComDesconto(alvo.valor, manos.length, d.config.descontoIrmaos ?? 10); toast(`Irmão de ${manos.map(x => x.nome.split(" ")[0]).join(", ")}: desconto de ${d.config.descontoIrmaos ?? 10}%`); }
        d.alunos.unshift(alvo);
        if (f.faixa !== "branca" || graus) d.graduacoes.push({ alunoId: alvo.id, data: hoje, faixa: f.faixa, graus });
        const comp = hoje.slice(0, 7), dv = String(alvo.vencimentoDia).padStart(2, "0"), venc = `${comp}-${dv}` < hoje ? hoje : `${comp}-${dv}`;
        d.mensalidades.push({ id: store.novoId("m"), alunoId: alvo.id, competencia: comp, vencimento: venc, valor: alvo.valor, pagoEm: null, forma: null });
        const numero = `CTR-${hoje.slice(0, 4)}-${String(100 + d.contratos.length).padStart(3, "0")}`;
        d.contratos.push({ id: store.novoId("ct"), numero, alunoId: alvo.id, modeloId: "doc1", emissao: hoje, status: "pendente" });
      } else {
        Object.assign(alvo, campos);
      }
      const arqFoto = novo ? foto?.files?.[0] : null;
      store.salvar();
      fechar();
      toast(novo ? `${nome.split(" ")[0]} cadastrado!` : "Dados salvos");
      aoSalvar?.(alvo);
      // Rosto só depois do aluno gravado: as regras do banco exigem que o aluno exista.
      if (arqFoto) Promise.resolve(store.gravando).then(ok => ok !== false && import("./rosto.js").then(m => m.cadastrarFotoRosto(store, alvo, arqFoto)));
    };
  });
}

export default {
  titulo: "Alunos",
  montar(el, params, ctx) {
    if (params[0] === "busca") {
      // Veio da busca do topo: procura nas duas abas e abre a que tem resultado.
      const q = normalizar(params[1] || ""), acha = c => ctx.store.dados.alunos.some(a => (a.categoria || "adulto") === c && (normalizar(a.nome).includes(q) || normalizar(a.responsavel?.nome).includes(q)));
      Object.assign(estado, { busca: params[1] || "", status: "Todos", faixa: null });
      if (!acha(aba()) && acha(aba() === "kids" ? "adulto" : "kids")) definirAba(aba() === "kids" ? "adulto" : "kids");
      history.replaceState(null, "", "#alunos");
    }
    const { store } = ctx, hoje = hojeISO(), kids = aba() === "kids";
    const faixas = faixasDe(aba());
    if (estado.faixa && !faixas.includes(estado.faixa)) estado.faixa = null;
    el.innerHTML = cabecalho("Alunos", "Matrículas, faixas e frequência.",
      `<button class="btn sec" id="exportar">${icone("documentos")}Exportar CSV</button><button class="btn" id="novo">${icone("prospects")}${kids ? "Nova criança" : "Novo aluno"}</button>`) +
      abasCategoria(store.dados) +
      `<div class="card"><div class="filtros" style="margin-bottom:12px">
        <label class="busca">${icone("alunos")}<input id="busca" type="search" placeholder="${kids ? "Buscar pela criança ou responsável" : "Buscar aluno pelo nome"}" value="${esc(estado.busca)}" aria-label="Buscar aluno"></label>
        <div class="chips" id="f-status">${["Todos", "Ativos", "Inadimplentes", "Trancados"].map(s => `<button class="chip${estado.status === s ? " on" : ""}" data-s="${s}">${s}</button>`).join("")}</div>
      </div>
      <div class="chips" id="f-faixa" style="margin-bottom:6px">${faixas.map(f => `<button class="chip${estado.faixa === f ? " on" : ""}" data-f="${f}"><span class="bolinha" style="background:${CORES_FAIXA[f]}"></span>${nomeFaixa(f)}</button>`).join("")}</div>
      <div id="lista"></div></div>`;

    const lista = el.querySelector("#lista");
    let visiveis = [];
    function desenharLista() {
      const d = store.dados, devendo = new Set(inadimplentes(d.mensalidades, d.alunos, hoje)), q = normalizar(estado.busca);
      const daCategoria = d.alunos.filter(daAba);
      visiveis = daCategoria.filter(a =>
        (!q || normalizar(a.nome).includes(q) || normalizar(a.responsavel?.nome).includes(q)) && (!estado.faixa || a.faixa === estado.faixa) &&
        (estado.status === "Todos" || (estado.status === "Ativos" && a.status === "ativo") ||
          (estado.status === "Trancados" && a.status === "trancado") || (estado.status === "Inadimplentes" && devendo.has(a.id))))
        .sort((x, y) => x.nome.localeCompare(y.nome, "pt-BR"));
      const sub = a => kids
        ? `${anosTexto(idadeEm(a.nascimento, hoje))} · resp.: ${esc(a.responsavel?.nome || "—")}${a.responsavel?.telefone ? " " + esc(a.responsavel.telefone) : ""}`
        : `${esc(a.plano)}${a.telefone ? " · " + esc(a.telefone) : ""}`;
      lista.innerHTML = `<p class="muted" style="font-size:12px;margin:8px 0">${visiveis.length} de ${daCategoria.length} ${kids ? "crianças" : "alunos"}</p>` + (visiveis.length
        ? `<table class="tabela resp"><thead><tr><th>${kids ? "Criança" : "Aluno"}</th><th>Faixa</th><th class="num">Aulas 30 dias</th><th>Desde</th><th>Status</th></tr></thead><tbody>` +
          visiveis.map(a => `<tr class="clica" data-id="${esc(a.id)}" tabindex="0"><td class="cheia">${pessoa(a, sub(a))}</td>
            <td>${faixaCelula(a)}</td><td class="num" data-l="Aulas 30d:">${aulas30(a.id, d.checkins, hoje)}</td>
            <td class="esconde-m">${dataLonga(a.desde)}</td><td>${devendo.has(a.id) ? PILL_STATUS.inadimplente : PILL_STATUS[a.status]}</td></tr>`).join("") + `</tbody></table>`
        : `<div class="vazio">Nenhum${kids ? "a criança encontrada" : " aluno encontrado"} com esses filtros.</div>`);
      lista.querySelectorAll("tr[data-id]").forEach(tr => {
        const ir = () => ctx.ir(`aluno/${encodeURIComponent(tr.dataset.id)}`);
        tr.onclick = ir; tr.onkeydown = e => { if (e.key === "Enter") ir(); };
      });
    }
    ligarAbas(el, ctx, () => { estado.faixa = null; });
    el.querySelector("#busca").oninput = e => { estado.busca = e.target.value; desenharLista(); };
    el.querySelectorAll("#f-status [data-s]").forEach(b => b.onclick = () => {
      estado.status = b.dataset.s; el.querySelectorAll("#f-status .chip").forEach(c => c.classList.toggle("on", c === b)); desenharLista();
    });
    el.querySelectorAll("#f-faixa [data-f]").forEach(b => b.onclick = () => {
      estado.faixa = estado.faixa === b.dataset.f ? null : b.dataset.f;
      el.querySelectorAll("#f-faixa .chip").forEach(c => c.classList.toggle("on", c.dataset.f === estado.faixa)); desenharLista();
    });
    el.querySelector("#novo").onclick = () => abrirFormAluno(store, null, a => ctx.ir(`aluno/${a.id}`));
    el.querySelector("#exportar").onclick = () => {
      const cab = ["Nome", "Faixa", "Graus", "Plano", "Telefone", "Desde", "Status", "Aulas 30 dias", ...(kids ? ["Responsável", "Idade"] : [])];
      const linhas = [cab, ...visiveis.map(a => [a.nome, nomeFaixa(a.faixa), a.graus, a.plano, a.telefone, dataLonga(a.desde), a.status, aulas30(a.id, store.dados.checkins, hoje),
        ...(kids ? [a.responsavel?.nome || "", idadeEm(a.nascimento, hoje)] : [])])];
      const link = document.createElement("a");
      link.href = URL.createObjectURL(new Blob([csv(linhas)], { type: "text/csv;charset=utf-8" }));
      link.download = `${kids ? "kids" : "alunos"}-gb-sobradinho-${hoje}.csv`;
      link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    };
    desenharLista();
    if (params[0] === "novo") { history.replaceState(null, "", "#alunos"); abrirFormAluno(store, null, a => ctx.ir(`aluno/${a.id}`)); }
  }
};
