import { hojeISO } from "../logica/datas.js";
import { categoriaIdade, categoriaPeso } from "../logica/categorias.js";
import { salvarPerfil, listarPesos, registrarPeso } from "../dados.js";
import { sair } from "../nuvem.js";
import { faixaSVG, NOMES, corDaFaixa, proximaFaixa } from "../ui/faixa.js";
import { esc, iniciais, numero, abrirFolha, perguntar, toast, nomeMes } from "../ui/util.js";

let pesos = null, pesosDe = null; // cache da última leitura (por usuário)

export default {
  menu: "perfil",
  vivo: true,
  montar(el, params, ctx) {
    const e = ctx.estado, p = e.perfil, hoje = hojeISO();
    if (pesosDe !== e.uid) { pesos = null; pesosDe = e.uid; }
    if (pesos === null) listarPesos(e.uid).then(l => { pesos = l; this.montar(el, params, ctx); }).catch(() => { pesos = []; });
    const ultimo = pesos?.[0];
    const graus = p.graus?.length || 0;
    const ci = categoriaIdade(p.nascimento, hoje);
    const cp = ultimo ? categoriaPeso(ultimo.kg, p.sexo) : null;
    const [ay, am] = (p.faixa?.desde || hoje.slice(0, 7)).split("-").map(Number);
    const cor = corDaFaixa(p.faixa?.cor), prox = proximaFaixa(cor);

    el.innerHTML = `
      <div class="pf">
        <div class="logo pf-logo" role="img" aria-label="GB Sobradinho"></div>
        <div class="foto"><span class="ini">${esc(iniciais(p.nome))}</span></div>
        <h3>${esc(p.nome)}</h3><small class="muted">GB Sobradinho</small>
      </div>
      <div class="beltwrap">${faixaSVG(graus, { cor })}<div class="lbl"><span>Faixa ${NOMES[cor]}${p.faixa?.desde ? ` desde ${nomeMes(am).slice(0, 3)}/${ay}` : ""}</span><span>${graus} de 4 graus</span></div></div>
      <p class="muted" style="font-size:12.5px;text-align:center;margin:0">Faixa e graus são registrados pela academia no GB Admin.</p>
      <div class="cats">
        <button class="cat" id="catIdade"><small>Categoria de idade</small><b>${ci ? ci.nome : "—"}</b><span>${ci ? `${ci.idadeNoAno} anos no ano` : p.nascimento ? "abaixo de 16 anos" : "sem nascimento no cadastro"}</span></button>
        <button class="cat" id="catPeso"><small>Categoria de peso</small><b>${cp ? cp.nome : "—"}</b><span>${cp ? `${numero(ultimo.kg)} kg${cp.limite ? " · até " + numero(cp.limite) : ""}` : !p.sexo ? "sem sexo no cadastro" : "Informe o peso"}</span></button>
      </div>
      <div class="card kv">
        <div><span>Peso</span><span class="step"><b>${ultimo ? numero(ultimo.kg) + " kg" : "—"}</b><button class="link" id="peso" style="width:auto;height:auto;background:none">Atualizar</button></span></div>
        <div><span>Meta por semana</span><span class="step"><button id="menos" aria-label="Diminuir">−</button><b>${p.metaSemanal}</b><button id="mais" aria-label="Aumentar">+</button></span></div>
        ${prox ? `<button id="roxa"><span>Aulas até a ${NOMES[prox]}</span><b>${p.metaAulasRoxa} ›</b></button>` : ""}
        <button id="dados"><span>Dados pessoais</span><b>›</b></button>
      </div>
      <button class="btn sair" id="sair"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"/><path d="M21 12H10M17 8l4 4-4 4"/></svg><span>Sair da conta</span></button>`;

    const $ = id => el.querySelector("#" + id);

    const pedirPeso = () => formulario("Atualizar peso", [
      { id: "kg", rotulo: "Peso em kg", tipo: "number", valor: ultimo ? ultimo.kg : "", passo: "0.1" }
    ], async v => {
      const kg = Number(String(v.kg).replace(",", "."));
      if (!(kg > 20 && kg < 250)) { toast("Peso inválido."); return; }
      await registrarPeso(e.uid, { data: hoje, kg });
      pesos = null; this.montar(el, params, ctx);
      toast("Peso registrado.");
    });
    $("peso").onclick = pedirPeso;
    $("catPeso").onclick = () => pedirPeso();
    $("catIdade").onclick = () => abrirDados();

    const mudarMeta = d => salvarPerfil(e.uid, { metaSemanal: Math.max(1, Math.min(7, p.metaSemanal + d)) });
    $("menos").onclick = () => mudarMeta(-1);
    $("mais").onclick = () => mudarMeta(1);
    if ($("roxa")) $("roxa").onclick = () => formulario(`Aulas até a ${NOMES[prox]}`, [
      { id: "n", rotulo: `Meta de aulas na faixa ${NOMES[cor]}`, tipo: "number", valor: p.metaAulasRoxa, passo: "1" }
    ], async v => {
      const n = Math.round(Number(v.n));
      if (!(n >= 1 && n <= 2000)) { toast("Número inválido."); return; }
      await salvarPerfil(e.uid, { metaAulasRoxa: n });
    });

    // Dados pessoais vêm do cadastro na academia (GB Admin): aqui só para ver.
    const abrirDados = () => abrirFolha((folha, fechar) => {
      const linha = (rotulo, valor) => `<div class="field"><label>${esc(rotulo)}</label><input class="input" value="${esc(valor || "—")}" readonly></div>`;
      folha.innerHTML = `<h3>Dados pessoais</h3>
        ${linha("Nome", p.nome)}${linha("Nascimento", p.nascimento ? p.nascimento.split("-").reverse().join("/") : "")}
        ${linha("Sexo", p.sexo === "M" ? "Masculino" : p.sexo === "F" ? "Feminino" : "")}${linha("E-mail", e.email)}
        <p class="muted" style="font-size:12.5px;margin:0">Esses dados vêm do seu cadastro na academia. Para corrigir, fale com o professor ou a recepção.</p>
        <button class="btn ghost" id="fechar">Fechar</button>`;
      folha.querySelector("#fechar").onclick = fechar;
    });
    $("dados").onclick = abrirDados;
    $("sair").onclick = async () => { if (await perguntar("Sair do portal?", "Para entrar de novo, use seu e-mail e senha.", "Sair", "Cancelar")) sair(); };
  }
};

function formulario(titulo, campos, aoSalvar) {
  abrirFolha((folha, fechar) => {
    folha.innerHTML = `<h3>${esc(titulo)}</h3>` + campos.map(c => `<div class="field"><label for="f_${c.id}">${esc(c.rotulo)}</label>${
      c.tipo === "select" ? `<select class="input" id="f_${c.id}">${c.opcoes.map(([v, t]) => `<option value="${v}" ${v === c.valor ? "selected" : ""}>${t}</option>`).join("")}</select>`
      : `<input class="input" id="f_${c.id}" maxlength="80" type="${c.tipo || "text"}" value="${esc(c.valor)}" ${c.passo ? `step="${c.passo}" inputmode="decimal"` : ""} ${c.somenteLeitura ? "readonly" : ""}>`}</div>`).join("") +
      `<div class="acoes"><button class="btn ghost" id="c">Cancelar</button><button class="btn" id="ok">Salvar</button></div>`;
    folha.querySelector("#c").onclick = fechar;
    folha.querySelector("#ok").onclick = async () => {
      const v = {}; campos.forEach(c => { v[c.id] = folha.querySelector("#f_" + c.id).value; });
      fechar(); await aoSalvar(v);
    };
  });
}
