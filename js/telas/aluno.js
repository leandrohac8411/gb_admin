// Ficha do aluno: dados, categoria IBJJF, frequência, próximo passo, mensalidades, graduações e check-ins.
import { esc, iniciais, dataLonga, dataCurta, horaTexto, perguntar, toast } from "../ui/util.js";
import { reais, anelClaroSVG, competenciaTexto } from "../ui/util-admin.js";
import { faixaSVG, nomeFaixa, faixasDe, corBase } from "../ui/faixa.js";
import { hojeISO } from "../logica/datas.js";
import { categoriaIdade, categoriaPeso } from "../logica/categorias.js";
import { aptidao, regrasDe, mesesEntre, idadeEm, passaParaAdulto, ehKids } from "../logica/graduacao.js";
import { statusMensalidade, inadimplentes } from "../logica/financeiro.js";
import { icone } from "../menu.js";
import { etiquetaPrograma, porId, PILL_STATUS, DIAS_CURTOS } from "./comum.js";
import { aulas30, abrirFormAluno } from "./alunos.js";


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
    const idade = categoriaIdade(a.nascimento, hoje), peso = categoriaPeso(a.peso, a.sexo);
    const lista = faixasDe(a.categoria), proximaCor = lista[lista.indexOf(a.faixa) + 1];
    const minMeses = kids ? R.mesesMinFaixa : R.mesesMinFaixa[a.faixa];
    const turmaKids = kids ? d.turmas.filter(t => t.categoria === "kids" && anos >= t.idadeMin && Math.min(anos, 15) <= t.idadeMax && t.idadeMax - t.idadeMin < 11)[0] : null;
    const n30 = aulas30(a.id, d.checkins, hoje), apt = aptidao(a, d.checkins, hoje);
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
      : apt.faltamAulas ? `Faltam ${apt.faltamAulas} aulas para ${a.graus === 4 ? `a faixa ${nomeFaixa(proximaCor).toLowerCase()}` : `o ${a.graus + 1}º grau`}.`
      : a.graus === 4 && mesesEntre(a.desdeFaixa, hoje) < minMeses ? `4 graus: pede ${minMeses} meses na faixa (está com ${mesesEntre(a.desdeFaixa, hoje)}).`
      : a.graus === 4 && kids ? `4 graus: a faixa ${nomeFaixa(proximaCor).toLowerCase()} pede ${R.idadeMin[corBase(proximaCor)]} anos (tem ${anos}).`
      : apt.faltamAulas ? `Faltam ${apt.faltamAulas} aulas para o ${a.graus + 1}º grau.`
      : `Aulas completas; falta tempo (mín. ${R.mesesPorGrau} meses desde a última graduação).`;

    el.innerHTML = `<a class="voltar" href="#alunos">‹ Alunos</a>
      <div class="card ficha-topo">
        <span class="av g">${esc(iniciais(a.nome))}</span>
        <div class="quem"><h1>${esc(a.nome)}</h1><p class="muted" style="margin:4px 0 8px">${nomeFaixa(a.faixa)}${a.graus ? ` · ${a.graus}º grau` : ""}${kids ? ` · ${anos} anos` : ""} · desde ${dataLonga(a.desde)}</p>
          ${kids ? '<span class="pill kids">Kids</span> ' : ""}${devendo ? PILL_STATUS.inadimplente : PILL_STATUS[a.status]}${passaParaAdulto(a, hoje) ? ' <span class="pill alerta">Passa para Adultos</span>' : ""}</div>
        <div class="faixa-grande">${faixaSVG(a.faixa, a.graus)}</div>
        <div class="acoes-cab" style="display:flex;gap:8px"><button class="btn sec" id="editar">Editar</button>
          <button class="btn ${a.status === "ativo" ? "sec" : ""}" id="status">${a.status === "ativo" ? "Trancar matrícula" : "Reativar matrícula"}</button></div>
      </div>
      <div class="card dados">
        ${kids ? `<div><small>Idade · turma</small><b>${anos ?? "—"} anos${turmaKids ? ` · ${esc(turmaKids.publico)}` : ""}</b></div>
        <div><small>Peso</small><b>${a.peso ? `${String(a.peso).replace(".", ",")} kg` : "—"}</b></div>`
        : `<div><small>Idade · categoria</small><b>${idade ? `${idade.idadeNoAno} anos · ${idade.nome}` : "—"}</b></div>
        <div><small>Peso · categoria</small><b>${a.peso ? `${String(a.peso).replace(".", ",")} kg · ${peso?.nome || "—"}` : "—"}</b></div>`}
        <div><small>Plano</small><b>${esc(a.plano)} · ${reais(a.valor)}</b></div>
        <div><small>${kids ? "Telefone do responsável" : "Telefone"}</small><b>${esc(a.telefone || "—")}</b></div>
        <div><small>Na faixa desde</small><b>${dataLonga(a.desdeFaixa)}</b></div>
        <div><small>Última graduação</small><b>${dataLonga(a.ultimaGraduacao)}</b></div>
      </div>
      ${kids ? `<div class="grade2">
        <div class="card"><div class="card-cab"><h3>Responsável</h3></div><div class="lista">
          <div><div class="cresce"><b>${esc(a.responsavel?.nome || "—")}</b><small>${esc(a.responsavel?.parentesco || "")} · ${esc(a.responsavel?.telefone || "sem telefone")}</small></div></div>
          <div><div class="cresce"><b>Quem pode buscar</b><small>${esc(a.responsavel?.buscam || "não informado")}</small></div></div></div></div>
        <div class="card"><div class="card-cab"><h3>Saúde e autorizações</h3></div><div class="lista">
          <div><div class="cresce"><b>Alergias e observações</b><small>${esc(a.saude || "Nada informado")}</small></div>${a.saude ? '<span class="pill alerta">Atenção</span>' : ""}</div>
          <div><div class="cresce"><b>Uso de imagem</b><small>${a.autorizaImagem ? "Autorizado" : "Não autorizado: não postar fotos"}</small></div>${a.autorizaImagem ? '<span class="pill ok">Sim</span>' : '<span class="pill ruim">Não</span>'}</div></div></div>
      </div>` : ""}
      <div class="grade2">
        <div class="card"><div class="card-cab"><h3>Frequência</h3><small>últimos 30 dias</small></div>
          <div style="display:flex;align-items:center;gap:18px"><div class="anel">${anelClaroSVG(n30 / META_30_DIAS)}<b>${n30}<small>de ${META_30_DIAS} aulas</small></b></div>
          <p class="muted" style="margin:0">${n30 >= META_30_DIAS ? "Frequência excelente: 3 treinos por semana ou mais." : n30 >= 6 ? "Treinando com regularidade." : n30 ? "Frequência baixa: vale um contato." : "Sem treinos no último mês."}</p></div></div>
        <div class="card"><div class="card-cab"><h3>Próximo passo</h3><a class="link" href="#graduacoes">Graduações</a></div>
          <p style="margin:0 0 10px;font-weight:700">${proximo}</p>
          ${a.faixa !== "preta" ? `<div class="progresso ${apt.tipo ? "ok" : ""}"><i style="width:${Math.min(100, Math.round(apt.aulas / R.aulasPorGrau * 100))}%"></i></div>
          <small class="muted">${Math.min(apt.aulas, R.aulasPorGrau)} de ${R.aulasPorGrau} aulas desde a última graduação</small>` : ""}</div>
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
    el.querySelector("#status").onclick = async () => {
      const trancar = a.status === "ativo";
      if (!await perguntar(trancar ? "Trancar matrícula?" : "Reativar matrícula?",
        trancar ? `${a.nome} deixa de contar como ativo e sai das cobranças.` : `${a.nome} volta a contar como ativo.`,
        trancar ? "Trancar" : "Reativar", "Cancelar")) return;
      a.status = trancar ? "trancado" : "ativo";
      store.salvar(); toast(trancar ? "Matrícula trancada" : "Matrícula reativada"); ctx.redesenhar();
    };
  }
};
