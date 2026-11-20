// Alunos: busca, filtros, tabela (cartões no celular), cadastro e exportação CSV.
import { esc, abrirFolha, toast, dataLonga } from "../ui/util.js";
import { normalizar, csv } from "../ui/util-admin.js";
import { FAIXAS, nomeFaixa, CORES_FAIXA } from "../ui/faixa.js";
import { hojeISO, somarDias, dataValida } from "../logica/datas.js";
import { inadimplentes } from "../logica/financeiro.js";
import { icone } from "../menu.js";
import { cabecalho, pessoa, faixaCelula, PILL_STATUS } from "./comum.js";

const PLANOS = { Mensal: 280, Trimestral: 750, Anual: 2700 };
const estado = { busca: "", status: "Todos", faixa: null };

export function aulas30(alunoId, checkins, hoje) {
  const desde = somarDias(hoje, -30);
  return checkins.filter(c => c.alunoId === alunoId && c.data > desde && c.data <= hoje).length;
}

// Folha de cadastro/edição. aluno = null cria um novo.
export function abrirFormAluno(store, aluno, aoSalvar) {
  const hoje = hojeISO(), novo = !aluno, a = aluno || { sexo: "M", faixa: "branca", graus: 0, plano: "Mensal" };
  abrirFolha((el, fechar) => {
    el.innerHTML = `<h3>${novo ? "Novo aluno" : "Editar aluno"}</h3>
      <form class="campos" novalidate>
        <div class="field cheio"><label for="f-nome">Nome completo</label><input class="input" id="f-nome" name="nome" value="${esc(a.nome || "")}" required autocomplete="off"></div>
        <div class="field"><label for="f-sexo">Sexo</label><select class="input" id="f-sexo" name="sexo"><option value="M"${a.sexo === "M" ? " selected" : ""}>Masculino</option><option value="F"${a.sexo === "F" ? " selected" : ""}>Feminino</option></select></div>
        <div class="field"><label for="f-nasc">Nascimento</label><input class="input" type="date" id="f-nasc" name="nascimento" value="${esc(a.nascimento || "")}" max="${hoje}"></div>
        <div class="field"><label for="f-peso">Peso (kg)</label><input class="input" type="number" inputmode="decimal" step="0.1" min="20" max="250" id="f-peso" name="peso" value="${esc(a.peso ?? "")}"></div>
        <div class="field"><label for="f-tel">Telefone</label><input class="input" id="f-tel" name="telefone" value="${esc(a.telefone || "")}" inputmode="tel"></div>
        ${novo ? `<div class="field"><label for="f-faixa">Faixa</label><select class="input" id="f-faixa" name="faixa">${FAIXAS.map(f => `<option value="${f}"${a.faixa === f ? " selected" : ""}>${nomeFaixa(f)}</option>`).join("")}</select></div>
        <div class="field"><label for="f-graus">Graus</label><select class="input" id="f-graus" name="graus">${[0, 1, 2, 3, 4].map(g => `<option${a.graus === g ? " selected" : ""}>${g}</option>`).join("")}</select></div>` : ""}
        <div class="field cheio"><label for="f-plano">Plano</label><select class="input" id="f-plano" name="plano">${Object.entries(PLANOS).map(([p, v]) => `<option value="${p}"${a.plano === p ? " selected" : ""}>${p} · R$ ${v}</option>`).join("")}</select></div>
        <p class="aviso cheio" id="f-erro" hidden></p>
        <div class="acoes cheio"><button type="button" class="btn ghost" id="f-cancelar">Cancelar</button><button class="btn" type="submit">${novo ? "Cadastrar" : "Salvar"}</button></div>
      </form>`;
    const form = el.querySelector("form"), erro = el.querySelector("#f-erro");
    el.querySelector("#f-cancelar").onclick = fechar;
    el.querySelector("#f-nome").focus();
    form.onsubmit = e => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(form));
      const nome = f.nome.trim().replace(/\s+/g, " ");
      const falha = nome.length < 3 ? "Escreva o nome completo."
        : f.nascimento && (!dataValida(f.nascimento) || f.nascimento > hoje) ? "Data de nascimento inválida."
        : f.peso && !(Number(f.peso) >= 20 && Number(f.peso) <= 250) ? "Peso deve ficar entre 20 e 250 kg." : "";
      if (falha) { erro.textContent = falha; erro.hidden = false; return; }
      const campos = { nome, sexo: f.sexo, nascimento: f.nascimento || "", peso: f.peso ? Number(f.peso) : null, telefone: f.telefone.trim(), plano: f.plano, valor: PLANOS[f.plano] };
      const d = store.dados;
      let alvo = aluno;
      if (novo) {
        const graus = Number(f.graus) || 0;
        alvo = { id: store.novoId("a"), ...campos, faixa: f.faixa, graus, desde: hoje, desdeFaixa: hoje, ultimaGraduacao: hoje, status: "ativo", vencimentoDia: 10 };
        d.alunos.unshift(alvo);
        if (f.faixa !== "branca" || graus) d.graduacoes.push({ alunoId: alvo.id, data: hoje, faixa: f.faixa, graus });
        const comp = hoje.slice(0, 7), venc = `${comp}-10` < hoje ? hoje : `${comp}-10`;
        d.mensalidades.push({ id: store.novoId("m"), alunoId: alvo.id, competencia: comp, vencimento: venc, valor: alvo.valor, pagoEm: null, forma: null });
      } else {
        Object.assign(alvo, campos);
      }
      store.salvar();
      fechar();
      toast(novo ? `${nome.split(" ")[0]} cadastrado!` : "Dados salvos");
      aoSalvar?.(alvo);
    };
  });
}

export default {
  titulo: "Alunos",
  montar(el, params, ctx) {
    const { store } = ctx, hoje = hojeISO();
    el.innerHTML = cabecalho("Alunos", "Matrículas, faixas e frequência.",
      `<button class="btn sec" id="exportar">${icone("documentos")}Exportar CSV</button><button class="btn" id="novo">${icone("prospects")}Novo aluno</button>`) +
      `<div class="card"><div class="filtros" style="margin-bottom:12px">
        <label class="busca">${icone("alunos")}<input id="busca" type="search" placeholder="Buscar aluno pelo nome" value="${esc(estado.busca)}" aria-label="Buscar aluno"></label>
        <div class="chips" id="f-status">${["Todos", "Ativos", "Inadimplentes", "Trancados"].map(s => `<button class="chip${estado.status === s ? " on" : ""}" data-s="${s}">${s}</button>`).join("")}</div>
      </div>
      <div class="chips" id="f-faixa" style="margin-bottom:6px">${FAIXAS.map(f => `<button class="chip${estado.faixa === f ? " on" : ""}" data-f="${f}"><span class="bolinha" style="background:${CORES_FAIXA[f]}"></span>${nomeFaixa(f)}</button>`).join("")}</div>
      <div id="lista"></div></div>`;

    const lista = el.querySelector("#lista");
    let visiveis = [];
    function desenharLista() {
      const d = store.dados, devendo = new Set(inadimplentes(d.mensalidades, d.alunos, hoje)), q = normalizar(estado.busca);
      visiveis = d.alunos.filter(a =>
        (!q || normalizar(a.nome).includes(q)) && (!estado.faixa || a.faixa === estado.faixa) &&
        (estado.status === "Todos" || (estado.status === "Ativos" && a.status === "ativo") ||
          (estado.status === "Trancados" && a.status === "trancado") || (estado.status === "Inadimplentes" && devendo.has(a.id))))
        .sort((x, y) => x.nome.localeCompare(y.nome, "pt-BR"));
      lista.innerHTML = `<p class="muted" style="font-size:12px;margin:8px 0">${visiveis.length} de ${d.alunos.length} alunos</p>` + (visiveis.length
        ? `<table class="tabela resp"><thead><tr><th>Aluno</th><th>Faixa</th><th class="num">Aulas 30 dias</th><th>Desde</th><th>Status</th></tr></thead><tbody>` +
          visiveis.map(a => `<tr class="clica" data-id="${esc(a.id)}" tabindex="0"><td class="cheia">${pessoa(a, `${esc(a.plano)}${a.telefone ? " · " + esc(a.telefone) : ""}`)}</td>
            <td>${faixaCelula(a)}</td><td class="num" data-l="Aulas 30d:">${aulas30(a.id, d.checkins, hoje)}</td>
            <td class="esconde-m">${dataLonga(a.desde)}</td><td>${devendo.has(a.id) ? PILL_STATUS.inadimplente : PILL_STATUS[a.status]}</td></tr>`).join("") + `</tbody></table>`
        : `<div class="vazio">Nenhum aluno encontrado com esses filtros.</div>`);
      lista.querySelectorAll("tr[data-id]").forEach(tr => {
        const ir = () => ctx.ir(`aluno/${encodeURIComponent(tr.dataset.id)}`);
        tr.onclick = ir; tr.onkeydown = e => { if (e.key === "Enter") ir(); };
      });
    }
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
      const linhas = [["Nome", "Faixa", "Graus", "Plano", "Telefone", "Desde", "Status", "Aulas 30 dias"],
        ...visiveis.map(a => [a.nome, nomeFaixa(a.faixa), a.graus, a.plano, a.telefone, dataLonga(a.desde), a.status, aulas30(a.id, store.dados.checkins, hoje)])];
      const link = document.createElement("a");
      link.href = URL.createObjectURL(new Blob([csv(linhas)], { type: "text/csv;charset=utf-8" }));
      link.download = `alunos-gb-sobradinho-${hoje}.csv`;
      link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    };
    desenharLista();
    if (params[0] === "novo") { history.replaceState(null, "", "#alunos"); abrirFormAluno(store, null, a => ctx.ir(`aluno/${a.id}`)); }
  }
};
