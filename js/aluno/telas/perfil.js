import { hojeISO } from "../logica/datas.js";
import { categoriaIdade, categoriaPeso } from "../logica/categorias.js";
import { salvarPerfil } from "../dados.js";
import { sair } from "../nuvem.js";
import { faixaSVG, NOMES, corDaFaixa, proximaFaixa } from "../ui/faixa.js";
import { esc, iniciais, numero, abrirFolha, perguntar, nomeMes, fotoSegura } from "../ui/util.js";

// Portal: tudo do cadastro (nome, foto, nascimento, sexo, peso, telefone, plano, faixa e graus) vem do GB Admin;
// o aluno só ajusta as metas dele.
export default {
  menu: "perfil",
  vivo: true,
  montar(el, params, ctx) {
    const e = ctx.estado, p = e.perfil, hoje = hojeISO();
    const graus = p.graus?.length || 0;
    const ci = categoriaIdade(p.nascimento, hoje);
    const cp = p.peso ? categoriaPeso(p.peso, p.sexo) : null;
    const foto = fotoSegura(p.foto);
    const [ay, am] = (p.faixa?.desde || hoje.slice(0, 7)).split("-").map(Number);
    const cor = corDaFaixa(p.faixa?.cor), prox = proximaFaixa(cor);
    const naFaixa = e.aulas.filter(a => !p.desdeFaixa || a.data >= p.desdeFaixa).length;

    el.innerHTML = `
      <div class="pf">
        <div class="logo pf-logo" role="img" aria-label="GB Sobradinho"></div>
        <div class="foto"${foto ? ` style="background-image:url(${foto});background-size:cover;background-position:center"` : ""}>${foto ? "" : `<span class="ini">${esc(iniciais(p.nome))}</span>`}</div>
        <h3>${esc(p.nome)}</h3><small class="muted">GB Sobradinho</small>
      </div>
      <div class="beltwrap">${faixaSVG(graus, { cor })}<div class="lbl"><span>Faixa ${NOMES[cor]}${p.faixa?.desde ? ` desde ${nomeMes(am).slice(0, 3)}/${ay}` : ""}</span><span>${graus} de 4 graus</span></div></div>
      <p class="muted" style="font-size:12.5px;text-align:center;margin:0">Faixa e graus são registrados pela academia no GB Admin.</p>
      <div class="cats">
        <button class="cat" id="catIdade"><small>Categoria de idade</small><b>${ci ? ci.nome : "—"}</b><span>${ci ? `${ci.idadeNoAno} anos no ano` : p.nascimento ? "abaixo de 16 anos" : "sem nascimento no cadastro"}</span></button>
        <button class="cat" id="catPeso"><small>Categoria de peso</small><b>${cp ? cp.nome : "—"}</b><span>${cp ? `${numero(p.peso)} kg${cp.limite ? " · até " + numero(cp.limite) : ""}` : !p.sexo ? "sem sexo no cadastro" : "sem peso no cadastro"}</span></button>
      </div>
      <div class="card kv">
        <div><span>Peso</span><span class="step"><b>${p.peso ? numero(p.peso) + " kg" : "—"}</b></span></div>
        ${p.plano ? `<div><span>Plano</span><span class="step"><b>${esc(p.plano)}</b></span></div>` : ""}
        <div><span>Meta por semana</span><span class="step"><button id="menos" aria-label="Diminuir">−</button><b>${p.metaSemanal}</b><button id="mais" aria-label="Aumentar">+</button></span></div>
        ${prox && p.metaAulasRoxa ? `<div><span>Aulas até a ${NOMES[prox]} <small class="muted" style="display:block;font-size:11px">regra da academia</small></span><span class="step"><b>${naFaixa} de ${p.metaAulasRoxa}</b></span></div>` : ""}
        <button id="dados"><span>Dados pessoais</span><b>›</b></button>
      </div>
      <button class="btn sair" id="sair"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"/><path d="M21 12H10M17 8l4 4-4 4"/></svg><span>Sair da conta</span></button>`;

    const $ = id => el.querySelector("#" + id);

    $("catPeso").onclick = () => abrirDados();
    $("catIdade").onclick = () => abrirDados();

    const mudarMeta = d => salvarPerfil(e.uid, { metaSemanal: Math.max(1, Math.min(7, p.metaSemanal + d)) });
    $("menos").onclick = () => mudarMeta(-1);
    $("mais").onclick = () => mudarMeta(1);

    // Dados pessoais vêm do cadastro na academia (GB Admin): aqui só para ver.
    const abrirDados = () => abrirFolha((folha, fechar) => {
      const linha = (rotulo, valor) => `<div class="field"><label>${esc(rotulo)}</label><input class="input" value="${esc(valor || "—")}" readonly></div>`;
      folha.innerHTML = `<h3>Dados pessoais</h3>
        ${linha("Nome", p.nome)}${linha("Nascimento", p.nascimento ? p.nascimento.split("-").reverse().join("/") : "")}
        ${linha("Sexo", p.sexo === "M" ? "Masculino" : p.sexo === "F" ? "Feminino" : "")}${linha("Peso", p.peso ? `${numero(p.peso)} kg` : "")}
        ${linha("Telefone", p.telefone)}${linha("Plano", p.plano)}${linha("E-mail", e.email)}
        <p class="muted" style="font-size:12.5px;margin:0">Esses dados vêm do seu cadastro na academia. Para corrigir, fale com o professor ou a recepção.</p>
        <button class="btn ghost" id="fechar">Fechar</button>`;
      folha.querySelector("#fechar").onclick = fechar;
    });
    $("dados").onclick = abrirDados;
    $("sair").onclick = async () => { if (await perguntar("Sair do portal?", "Para entrar de novo, use seu e-mail e senha.", "Sair", "Cancelar")) sair(); };
  }
};
