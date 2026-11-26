// Ficha do aluno: dados, categoria IBJJF, frequência, próximo passo, mensalidades, graduações e check-ins.
import { esc, iniciais, dataLonga, dataCurta, horaTexto, perguntar, toast, abrirFolha } from "../ui/util.js";
import { irmaos, mediaComportamento, CRITERIOS, NOMES_CRITERIOS } from "../logica/familia.js";
import { reais, anelClaroSVG, competenciaTexto } from "../ui/util-admin.js";
import { faixaSVG, nomeFaixa, faixasDe, corBase } from "../ui/faixa.js";
import { hojeISO } from "../logica/datas.js";
import { categoriaIdade, categoriaPeso } from "../logica/categorias.js";
import { aptidao, regrasDe, mesesEntre, idadeEm, passaParaAdulto, ehKids, progressoGraduacao } from "../logica/graduacao.js";
import { statusMensalidade, inadimplentes } from "../logica/financeiro.js";
import { noCartaoRecorrente } from "../logica/cobranca.js";
import { icone } from "../menu.js";
import { etiquetaPrograma, porId, PILL_STATUS, DIAS_CURTOS, estrelas, marcaAluno } from "./comum.js";
import { aulas30, abrirFormAluno } from "./alunos.js";
import { cartaoRosto, ligarCartaoRosto } from "./rosto.js";
import { cartaoPortal, ligarCartaoPortal } from "./portal-cartao.js";


const MOTIVOS = ["Mudança", "Financeiro", "Lesão", "Horário", "Falta de tempo", "Insatisfação", "Outro"];

export default {
  titulo: "Ficha do aluno",
  montar(el, params, ctx) {
    const { store } = ctx, d = store.dados, hoje = hojeISO(), META_30_DIAS = d.config.metaAulas30 || 12;
    const a = d.alunos.find(x => x.id === params[0]);
    if (!a) {
      el.innerHTML = `<div class="card vazio grande">${icone("alunos")}<h2>Aluno não encontrado</h2><p>Talvez ele tenha sido removido ou o endereço esteja errado.</p><a class="btn" href="#alunos">Ver alunos</a></div>`;
      return;
    }
    const kids = ehKids(a), R = regrasDe(a), anos = idadeEm(a.nascimento, hoje);
    const avs = (d.avaliacoes || []).filter(v => v.alunoId === a.id).sort((x, y) => y.mes.localeCompare(x.mes)).slice(0, 3);
    const media = mediaComportamento(d.avaliacoes || [], a.id);
    const idade = categoriaIdade(a.nascimento, hoje), peso = categoriaPeso(a.peso, a.sexo);
    const lista = faixasDe(a.categoria), proximaCor = lista[lista.indexOf(a.faixa) + 1];
    const minMeses = kids ? R.mesesMinFaixa : null;
    const turmaKids = kids ? d.turmas.filter(t => t.categoria === "kids" && anos >= t.idadeMin && Math.min(anos, 15) <= t.idadeMax && t.idadeMax - t.idadeMin < 11)[0] : null;
    const n30 = aulas30(a.id, d.checkins, hoje), apt = aptidao(a, d.checkins, hoje), prog = progressoGraduacao(a, apt);
    const devendo = inadimplentes(d.mensalidades, d.alunos, hoje).includes(a.id);
    const turmas = porId(d.turmas);
    const mens = d.mensalidades.filter(m => m.alunoId === a.id).sort((x, y) => y.competencia.localeCompare(x.competencia)).slice(0, 4);
    const grads = d.graduacoes.filter(g => g.alunoId === a.id).sort((x, y) => y.data.localeCompare(x.data));
    const ultimos = d.checkins.filter(c => c.alunoId === a.id).sort((x, y) => (y.data + y.hora).localeCompare(x.data + x.hora)).slice(0, 10);
    const proximo = a.status === "trancado" ? "Matrícula trancada: a contagem para graduação fica parada."
      : a.faixa === "preta" ? "Faixa preta: graus por tempo de faixa, fora desta regra."
      : passaParaAdulto(a, hoje) ? `Fez ${anos} anos: hora de passar para a turma de Adultos.`
      : !proximaCor && a.graus === 4 ? "Última faixa kids completa. Aos 16 anos passa para Adultos."
      : apt.tipo === "faixa" ? `Pronto para a faixa ${nomeFaixa(apt.proximaFaixa).toLowerCase()}!`
      : apt.tipo === "grau" ? `Pronto para o ${a.graus + 1}º grau!`
      // Adulto: passo previsto pelo tempo da faixa + aulas proporcionais (Configurações › Regras de graduação).
      : !kids && apt.dataPrevista ? `${a.graus === 4 ? `Faixa ${nomeFaixa(proximaCor).toLowerCase()}` : `${a.graus + 1}º grau`} previsto para ${dataLonga(apt.dataPrevista)}${apt.diasFaltam ? ` (em ${apt.diasFaltam} dias)` : ""}${apt.faltamAulas ? ` · faltam ${apt.faltamAulas} aulas` : " · aulas completas"}.`
      : apt.faltamAulas ? `Faltam ${apt.faltamAulas} aulas para ${a.graus === 4 ? `a faixa ${nomeFaixa(proximaCor).toLowerCase()}` : `o ${a.graus + 1}º grau`}.`
      : a.graus === 4 && mesesEntre(a.desdeFaixa, hoje) < minMeses ? `4 graus: pede ${minMeses} meses na faixa (está com ${mesesEntre(a.desdeFaixa, hoje)}).`
      : a.graus === 4 && kids ? `4 graus: a faixa ${nomeFaixa(proximaCor).toLowerCase()} pede ${R.idadeMin[corBase(proximaCor)]} anos (tem ${anos}).`
      : apt.faltamAulas ? `Faltam ${apt.faltamAulas} aulas para o ${a.graus + 1}º grau.`
      : `Aulas completas; falta tempo (mín. ${R.mesesPorGrau} meses desde a última graduação).`;

    el.innerHTML = `<a class="voltar" href="#alunos">‹ Alunos</a>
      <div class="card ficha-topo">
        <span class="av g">${esc(iniciais(a.nome))}</span>
        <div class="quem"><h1>${esc(a.nome)}${marcaAluno(a)}</h1><p class="muted" style="margin:4px 0 8px">${nomeFaixa(a.faixa)}${a.graus ? ` · ${a.graus}º grau` : ""}${kids ? ` · ${anos ?? "idade não informada"}${anos != null ? " anos" : ""}` : ""} · desde ${dataLonga(a.desde)}</p>
          ${kids ? '<span class="pill kids">Kids</span> ' : ""}${devendo ? PILL_STATUS.inadimplente : PILL_STATUS[a.status]}${passaParaAdulto(a, hoje) ? ' <span class="pill alerta">Passa para Adultos</span>' : ""}</div>
        <div class="faixa-grande">${faixaSVG(a.faixa, a.graus)}</div>
        <div class="acoes-cab" style="display:flex;gap:8px"><button class="btn sec" id="editar">Editar</button>
          <button class="btn ${a.status === "ativo" ? "sec" : ""}" id="status">${a.status === "ativo" ? "Trancar matrícula" : "Reativar matrícula"}</button></div>
      </div>
      ${store.modo === "painel" ? cartaoRosto(a, d) + cartaoPortal(a) : ""}
      <div class="card dados">
        ${kids ? `<div><small>Idade · turma</small><b>${anos != null ? `${anos} anos` : "Sem data de nascimento"}${turmaKids ? ` · ${esc(turmaKids.publico)}` : ""}</b></div>
        <div><small>Peso</small><b>${a.peso ? `${String(a.peso).replace(".", ",")} kg` : "—"}</b></div>`
        : `<div><small>Idade · categoria</small><b>${idade ? `${idade.idadeNoAno} anos · ${idade.nome}` : "—"}</b></div>
        <div><small>Peso · categoria</small><b>${a.peso ? `${String(a.peso).replace(".", ",")} kg · ${peso?.nome || "—"}` : "—"}</b></div>`}
        <div><small>Plano</small><b>${esc(a.plano)} · ${reais(a.valor)}${noCartaoRecorrente(a, d.planos) ? " · cartão recorrente" : ""}</b></div>
        <div><small>${kids ? "Telefone do responsável" : "Telefone"}</small><b>${esc(a.telefone || "—")}</b></div>
        <div><small>Na faixa desde</small><b>${dataLonga(a.desdeFaixa)}</b></div>
        <div><small>Última graduação</small><b>${dataLonga(a.ultimaGraduacao)}</b></div>
      </div>
      ${kids ? `<div class="grade2">
        <div class="card"><div class="card-cab"><h3>Responsável</h3></div><div class="lista">
          <div><div class="cresce"><b>${esc(a.responsavel?.nome || "—")}</b><small>${esc(a.responsavel?.parentesco || "")} · ${esc(a.responsavel?.telefone || "sem telefone")}</small></div></div>
          <div><div class="cresce"><b>Quem pode buscar</b><small>${esc(a.responsavel?.buscam || "não informado")}</small></div></div>
          ${irmaos(a, d.alunos).length ? `<div><div class="cresce"><b>Irmãos na academia</b><small>${irmaos(a, d.alunos).map(i => `<a class="link" href="#aluno/${encodeURIComponent(i.id)}">${esc(i.nome.split(" ")[0])}</a>`).join(", ")} · desconto de ${d.config.descontoIrmaos ?? 10}% a partir do 2º filho</small></div></div>` : ""}</div></div>
        <div class="card"><div class="card-cab"><h3>Saúde e autorizações</h3></div><div class="lista">
          <div><div class="cresce"><b>Alergias e observações</b><small>${esc(a.saude || "Nada informado")}</small></div>${a.saude ? '<span class="pill alerta">Atenção</span>' : ""}</div>
          <div><div class="cresce"><b>Uso de imagem</b><small>${a.autorizaImagem ? "Autorizado" : "Não autorizado: não postar fotos"}</small></div>${a.autorizaImagem ? '<span class="pill ok">Sim</span>' : '<span class="pill ruim">Não</span>'}</div></div></div>
        <div class="card"><div class="card-cab"><h3>Comportamento</h3><button class="btn sec peq" id="avaliar">Avaliar ${competenciaTexto(hoje.slice(0, 7)).split(" ")[0].toLowerCase()}</button></div>
          ${avs.length && media != null ? `<div style="display:flex;align-items:center;gap:14px;margin-bottom:10px"><b style="font-size:30px">${String(media).replace(".", ",")}</b>
            <div>${estrelas(media)}<br><small class="muted">média de ${competenciaTexto(avs[0].mes).toLowerCase()}${media < 3 ? " · conversar com a família" : ""}</small></div></div>
            <div class="lista">${CRITERIOS.map(c => `<div><div class="cresce"><b>${NOMES_CRITERIOS[c]}</b></div>${estrelas(avs[0].notas[c])}</div>`).join("")}</div>
            ${avs[0].obs ? `<p class="aviso" style="margin-top:10px;background:var(--soft);color:var(--muted2)">${esc(avs[0].obs)}</p>` : ""}
            ${avs.length > 1 ? `<small class="muted">Meses anteriores: ${avs.slice(1).map(v => `${competenciaTexto(v.mes).split(" ")[0].slice(0, 3)} ${String(mediaComportamento(d.avaliacoes, a.id, v.mes)).replace(".", ",")}`).join(" · ")}</small>` : ""}`
            : `<div class="vazio">Ainda sem avaliação. Avalie respeito, disciplina, atenção e coleguismo.</div>`}</div>
      </div>` : ""}
      ${a.status === "trancado" && a.trancamento ? `<div class="aviso">Matrícula trancada em ${dataLonga(a.trancamento.data)} · motivo: <b>${esc(a.trancamento.motivo)}</b>${a.trancamento.obs ? ` · ${esc(a.trancamento.obs)}` : ""}</div>` : ""}
      <div class="grade2">
        <div class="card"><div class="card-cab"><h3>Frequência</h3><small>últimos 30 dias</small></div>
          <div style="display:flex;align-items:center;gap:18px"><div class="anel">${anelClaroSVG(n30 / META_30_DIAS)}<b>${n30}<small>de ${META_30_DIAS} aulas</small></b></div>
          <p class="muted" style="margin:0">${n30 >= META_30_DIAS ? "Frequência excelente: 3 treinos por semana ou mais." : n30 >= 6 ? "Treinando com regularidade." : n30 ? "Frequência baixa: vale um contato." : "Sem treinos no último mês."}</p></div></div>
        <div class="card"><div class="card-cab"><h3>Próximo passo</h3><a class="link" href="#graduacoes">Graduações</a></div>
          <p style="margin:0 0 10px;font-weight:700">${proximo}</p>
          ${a.faixa !== "preta" ? `<div class="progresso ${apt.tipo ? "ok" : ""}"><i style="width:${Math.min(100, Math.round(prog.feitas / (prog.necessarias || 1) * 100))}%"></i></div>
          <small class="muted">${Math.min(prog.feitas, prog.necessarias)} de ${prog.necessarias} aulas ${kids ? "desde a última graduação" : "na faixa para o próximo passo"}${!kids && apt.trocaFaixa ? ` · troca de faixa prevista para ${dataLonga(apt.trocaFaixa.data)}` : ""}</small>` : ""}</div>
        <div class="card"><div class="card-cab"><h3>Mensalidades</h3><a class="link" href="#financeiro">Financeiro</a></div>
          ${mens.length ? `<div class="lista">${mens.map(m => `<div><div class="cresce"><b>${competenciaTexto(m.competencia)}</b><small>vence ${dataLonga(m.vencimento)}${m.pagoEm ? ` · pago em ${dataLonga(m.pagoEm)}` : ""}</small></div><b>${reais(m.valor)}</b>${PILL_STATUS[statusMensalidade(m, hoje)]}</div>`).join("")}</div>`
            : `<div class="vazio">Nenhuma mensalidade lançada.</div>`}</div>
        <div class="card"><div class="card-cab"><h3>Graduações</h3><small>${grads.length}</small></div>
          ${grads.length ? `<div class="lista">${grads.map(g => `<div>${faixaSVG(g.faixa, g.graus, { mini: true })}<div class="cresce"><b>${nomeFaixa(g.faixa)}${g.graus ? ` · ${g.graus}º grau` : ""}</b><small>${dataLonga(g.data)}</small></div></div>`).join("")}</div>`
            : `<div class="vazio">Ainda sem graduações registradas.</div>`}</div>
        <div class="card"><div class="card-cab"><h3>Últimos check-ins</h3><small>${d.checkins.filter(c => c.alunoId === a.id).length} no total</small></div>
          ${ultimos.length ? `<div class="lista">${ultimos.map(c => { const t = turmas[c.turmaId]; return `<div><span class="hora">${horaTexto(c.hora)}</span><div class="cresce"><b>${dataCurta(c.data)}</b><small>${t ? DIAS_CURTOS[t.diaSemana] : ""}</small></div>${t ? etiquetaPrograma(t.programa) : ""}</div>`; }).join("")}</div>`
            : `<div class="vazio">Nenhum check-in ainda.</div>`}</div>
      </div>`;

    el.querySelector("#editar").onclick = () => abrirFormAluno(store, a, () => ctx.redesenhar());
    if (store.modo === "painel") { ligarCartaoRosto(el, store, a, ctx); ligarCartaoPortal(el, store, a, ctx); }
    const salvarStatus = msg => { store.salvar(); toast(msg); };
    el.querySelector("#status").onclick = async () => {
      if (a.status !== "ativo") {
        if (!await perguntar("Reativar matrícula?", `${a.nome} volta a contar como ativo.`, "Reativar", "Cancelar")) return;
        a.status = "ativo"; delete a.trancamento;
        salvarStatus("Matrícula reativada"); ctx.redesenhar(); return;
      }
      abrirFolha((f, fechar) => {
        f.innerHTML = `<h3>Trancar matrícula</h3><p class="muted" style="margin:0">${esc(a.nome)} deixa de contar como ativo e sai das cobranças.</p>
          <div class="field"><label>Por que está saindo?</label><div class="chips">${MOTIVOS.map(m => `<button type="button" class="chip" data-m="${m}">${m}</button>`).join("")}</div></div>
          <div class="field"><label for="tr-obs">Observação (opcional)</label><input class="input" id="tr-obs" placeholder="Ex.: volta em março"></div>
          <p class="aviso" id="tr-erro" hidden></p>
          <div class="acoes"><button class="btn ghost" id="tr-x">Cancelar</button><button class="btn" id="tr-ok">Trancar</button></div>`;
        let motivo = null;
        f.querySelectorAll("[data-m]").forEach(b => b.onclick = () => { motivo = b.dataset.m; f.querySelectorAll("[data-m]").forEach(c => c.classList.toggle("on", c === b)); });
        f.querySelector("#tr-x").onclick = fechar;
        f.querySelector("#tr-ok").onclick = () => {
          if (!motivo) { const e = f.querySelector("#tr-erro"); e.textContent = "Escolha o motivo."; e.hidden = false; return; }
          a.status = "trancado"; a.trancamento = { data: hoje, motivo, obs: f.querySelector("#tr-obs").value.trim() };
          fechar(); salvarStatus("Matrícula trancada"); ctx.redesenhar();
        };
      });
    };
    el.querySelector("#avaliar")?.addEventListener("click", () => {
      const mes = hoje.slice(0, 7), atual = (d.avaliacoes || []).find(v => v.alunoId === a.id && v.mes === mes);
      const notas = { ...(atual?.notas || { respeito: 3, disciplina: 3, atencao: 3, coleguismo: 3 }) };
      abrirFolha((f, fechar) => {
        f.innerHTML = `<h3>Comportamento de ${esc(a.nome.split(" ")[0])}</h3><p class="muted" style="margin:0">${competenciaTexto(mes)}</p>
          <div class="lista">${CRITERIOS.map(c => `<div><div class="cresce"><b>${NOMES_CRITERIOS[c]}</b></div><div class="estrelas-edit" data-c="${c}">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-n="${n}" aria-label="${NOMES_CRITERIOS[c]}: ${n} de 5" class="${n <= notas[c] ? "on" : ""}">★</button>`).join("")}</div></div>`).join("")}</div>
          <div class="field"><label for="av-obs">Observação (opcional)</label><input class="input" id="av-obs" value="${esc(atual?.obs || "")}"></div>
          <div class="acoes"><button class="btn ghost" id="av-x">Cancelar</button><button class="btn" id="av-ok">Salvar</button></div>`;
        f.querySelectorAll(".estrelas-edit").forEach(g => g.querySelectorAll("[data-n]").forEach(b => b.onclick = () => {
          notas[g.dataset.c] = Number(b.dataset.n);
          g.querySelectorAll("[data-n]").forEach(x => x.classList.toggle("on", Number(x.dataset.n) <= notas[g.dataset.c]));
        }));
        f.querySelector("#av-x").onclick = fechar;
        f.querySelector("#av-ok").onclick = () => {
          const obs = f.querySelector("#av-obs").value.trim();
          if (atual) Object.assign(atual, { notas, obs });
          else d.avaliacoes.push({ id: store.novoId("av"), alunoId: a.id, mes, notas, obs });
          store.salvar(); fechar(); toast("Avaliação salva"); ctx.redesenhar();
        };
      });
    });
  }
};
