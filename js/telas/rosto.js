// Cartão "Rosto para check-in" na ficha do aluno real: até 3 fotos viram 128 números cada
// (a foto em si não é guardada; só uma miniatura de 96 px do rosto, para o professor reconhecer).
import { esc, toast, abrirFolha, perguntar } from "../ui/util.js";
import { comprimirImagem } from "../foto.js";
import { escolherRostoCadastro, consentimentoPadrao, recorte, problemaNaFoto } from "../logica/cadastro-rosto.js";
import { salvarComAviso } from "../logica/mesclar.js";
import { hojeISO } from "../logica/datas.js";
import { semAlunos } from "../logica/baldes.js";

const MAX_FOTOS = 3;
const nuvem = () => import("../nuvem/dados.js");

// Recorta o rosto e reduz para 96 px (JPEG). Só para mostrar na tela de conferência.
async function miniatura(dataURL, rosto) {
  const img = await new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = dataURL; });
  const c = recorte(rosto, img.naturalWidth, img.naturalHeight);
  const lado = 96, canvas = document.createElement("canvas");
  canvas.width = lado; canvas.height = lado;
  const s = Math.max(c.w, c.h);
  canvas.getContext("2d").drawImage(img, c.x + (c.w - s) / 2, c.y + (c.h - s) / 2, s, s, 0, 0, lado, lado);
  return canvas.toDataURL("image/jpeg", 0.8);
}

export function cartaoRosto(a, d) {
  const r = d.rostos?.get(a.id), n = r?.descritores.length || 0;
  return `<div class="card" id="cartao-rosto"><div class="card-cab"><h3>Rosto para check-in</h3><small>${n} de ${MAX_FOTOS} fotos</small></div>
    <div class="rosto-linha">
      ${r?.mini ? `<img class="rosto-mini" src="${esc(r.mini)}" alt="Rosto de ${esc(a.nome)}">` : '<span class="rosto-mini vazio-mini" aria-hidden="true">?</span>'}
      <p class="muted" style="margin:0">${n ? `Cadastrado. Autorizado por <b>${esc(r.consentimento?.por || "—")}</b>${r.consentimento?.responsavel ? " (responsável)" : ""} em ${esc(r.consentimento?.data || "")}.`
        : "Sem rosto cadastrado: a foto da aula não reconhece este aluno."}${n && n < MAX_FOTOS ? " Mais fotos, de ângulos diferentes, deixam o reconhecimento mais firme." : ""}</p>
    </div>
    <div class="acoes" style="justify-content:flex-start;flex-wrap:wrap">
      ${n < MAX_FOTOS ? `<label class="btn sec peq" style="cursor:pointer">Adicionar foto do rosto<input type="file" accept="image/*" id="rosto-arq" hidden></label>` : ""}
      ${n ? '<button class="btn sec peq" id="rosto-apagar">Apagar dados do rosto</button>' : ""}
      <button class="btn sec peq" id="aluno-excluir">Excluir aluno</button>
    </div></div>`;
}

function pedirConsentimento(a, usuarioNome, anterior, finalidade) {
  const padrao = anterior || consentimentoPadrao(a, usuarioNome, hojeISO());
  return new Promise(ok => {
    abrirFolha((f, fechar) => {
      const nome = esc(a.nome);
      f.innerHTML = `<h3>Autorização do uso do rosto</h3>
        <p style="margin:0">${padrao.responsavel ? `Sou o responsável por <b>${nome}</b> e autorizo` : `Eu, <b>${nome}</b>, autorizo`} o uso da foto do rosto apenas para ${finalidade} da GB Sobradinho.
        Só são guardados números que descrevem o rosto e uma miniatura; os dados podem ser apagados a qualquer momento.</p>
        <div class="field"><label for="cs-por">Quem autoriza</label><input class="input" id="cs-por" maxlength="80" value="${esc(padrao.por)}"></div>
        <label class="check"><input type="checkbox" id="cs-ok"> Li e autorizo</label>
        <p class="aviso" id="cs-erro" hidden></p>
        <div class="acoes"><button class="btn ghost" id="cs-x">Cancelar</button><button class="btn" id="cs-sim">Salvar rosto</button></div>`;
      f.querySelector("#cs-x").onclick = () => { fechar(); ok(null); };
      f.querySelector("#cs-sim").onclick = () => {
        const por = f.querySelector("#cs-por").value.trim(), erro = f.querySelector("#cs-erro");
        if (por.length < 2) { erro.textContent = "Escreva o nome de quem autoriza."; erro.hidden = false; return; }
        if (!f.querySelector("#cs-ok").checked) { erro.textContent = "Marque \"Li e autorizo\" para continuar."; erro.hidden = false; return; }
        fechar(); ok({ ...padrao, por });
      };
    }, () => ok(null));
  });
}

// Analisa a foto, pede a autorização e grava os números do rosto. Usada na ficha e no cadastro do aluno.
// Também serve para o professor. A pessoa precisa já estar no banco (as regras só aceitam rosto de aluno ou professor que existe).
export async function cadastrarFotoRosto(store, a, arq) {
  const problema = problemaNaFoto(arq);
  if (!arq || problema) return problema && toast(problema);
  toast("Analisando o rosto…");
  try {
    const { dados } = await comprimirImagem(arq, 1280, 1_500_000);
    const { descreverRostos } = await import("../rostos.js");
    const escolha = escolherRostoCadastro(await descreverRostos(dados));
    if (!escolha.ok) return toast(escolha.motivo === "nenhum" ? "Não achei um rosto nessa foto. Use uma foto de frente e bem iluminada." : "Tem mais de um rosto: use uma foto só da pessoa.");
    const r = store.dados.rostos?.get(a.id);
    const professor = store.dados.professores?.some(p => p.id === a.id);
    const consentimento = await pedirConsentimento(a, store.dados.config.usuario?.nome || "", r?.consentimento,
      professor ? "reconhecer o professor nas fotos das aulas" : "registrar presença nas aulas");
    if (!consentimento) return;
    const descritores = [...(r?.descritores || []), escolha.rosto.descritor].slice(-MAX_FOTOS);
    const mini = r?.mini || await miniatura(dados, escolha.rosto);
    const { salvarRosto } = await nuvem();
    await salvarComAviso(salvarRosto(a.id, { descritores, mini, consentimento }), "Rosto salvo");
  } catch (err) {
    console.error(err);
    toast(/fetch|network|Failed/i.test(String(err?.message)) ? "Sem internet para carregar o reconhecimento." : "Não consegui analisar essa foto.");
  }
}

export function ligarCartaoRosto(el, store, a, ctx) {
  const cartao = el.querySelector("#cartao-rosto");
  if (!cartao) return;
  const atual = () => store.dados.rostos?.get(a.id);
  cartao.querySelector("#rosto-arq")?.addEventListener("change", e => {
    const arq = e.target.files?.[0]; e.target.value = "";
    if (arq) cadastrarFotoRosto(store, a, arq);
  });

  cartao.querySelector("#rosto-apagar")?.addEventListener("click", async () => {
    if (!await perguntar("Apagar dados do rosto?", `Os números e a miniatura de ${a.nome} saem do banco. A foto da aula deixa de reconhecer este aluno.`, "Apagar", "Cancelar")) return;
    const { apagarRosto } = await nuvem();
    await salvarComAviso(apagarRosto(a.id), "Dados do rosto apagados");
  });

  cartao.querySelector("#aluno-excluir")?.addEventListener("click", async () => {
    if (!await perguntar("Excluir aluno?", `${a.nome} sai do banco junto com o rosto, as presenças, as mensalidades, as graduações e as anotações dele. Não dá para desfazer.`, "Excluir", "Cancelar")) return;
    store.dados = semAlunos(store.dados, [a.id]);
    if (!store.salvar()) return;
    if (atual()) { const { apagarRosto } = await nuvem(); apagarRosto(a.id).catch(e => console.error(e)); }
    toast("Aluno excluído");
    ctx.ir("alunos");
  });
}
