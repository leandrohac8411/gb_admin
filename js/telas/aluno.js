// Ficha do aluno: dados, categoria IBJJF, frequência, próximo passo, mensalidades, graduações e check-ins.
import { esc, iniciais, dataLonga, dataCurta, horaTexto, perguntar, toast } from "../ui/util.js";
import { reais, anelClaroSVG, competenciaTexto } from "../ui/util-admin.js";
import { faixaSVG, nomeFaixa } from "../ui/faixa.js";
import { hojeISO } from "../logica/datas.js";
import { categoriaIdade, categoriaPeso } from "../logica/categorias.js";
import { aptidao, REGRAS, mesesEntre } from "../logica/graduacao.js";
import { statusMensalidade, inadimplentes } from "../logica/financeiro.js";
import { icone } from "../menu.js";
import { etiquetaPrograma, porId, PILL_STATUS, DIAS_CURTOS } from "./comum.js";
import { aulas30, abrirFormAluno } from "./alunos.js";

const META_30_DIAS = 12;

export default {
  titulo: "Ficha do aluno",
  montar(el, params, ctx) {
    const { store } = ctx, d = store.dados, hoje = hojeISO();
    const a = d.alunos.find(x => x.id === params[0]);
    if (!a) {
      el.innerHTML = `<div class="card vazio grande">${icone("alunos")}<h2>Aluno não encontrado</h2><p>Talvez ele tenha sido removido ou o endereço esteja errado.</p><a class="btn" href="#alunos">Ver alunos</a></div>`;
      return;
    }
    const idade = categoriaIdade(a.nascimento, hoje), peso = categoriaPeso(a.peso, a.sexo);
    const n30 = aulas30(a.id, d.checkins, hoje), apt = aptidao(a, d.checkins, hoje);
    const devendo = inadimplentes(d.mensalidades, d.alunos, hoje).includes(a.id);
    const turmas = porId(d.turmas);
    const mens = d.mensalidades.filter(m => m.alunoId === a.id).sort((x, y) => y.competencia.localeCompare(x.competencia)).slice(0, 4);
    const grads = d.graduacoes.filter(g => g.alunoId === a.id).sort((x, y) => y.data.localeCompare(x.data));
    const ultimos = d.checkins.filter(c => c.alunoId === a.id).sort((x, y) => (y.data + y.hora).localeCompare(x.data + x.hora)).slice(0, 10);
    const proximo = a.faixa === "preta" ? "Faixa preta: graus por tempo de faixa, fora desta regra."
      : apt.tipo === "faixa" ? `Pronto para a faixa ${nomeFaixa(apt.proximaFaixa).toLowerCase()}!`
      : apt.tipo === "grau" ? `Pronto para o ${a.graus + 1}º grau!`
      : a.graus === 4 ? `4 graus: faixa ${nomeFaixa(a.faixa).toLowerCase()} pede ${REGRAS.mesesMinFaixa[a.faixa]} meses na faixa (está com ${mesesEntre(a.desdeFaixa, hoje)}).`
      : apt.faltamAulas ? `Faltam ${apt.faltamAulas} aulas para o ${a.graus + 1}º grau.`
      : `Aulas completas; falta tempo (mín. ${REGRAS.mesesPorGrau} meses desde a última graduação).`;

    el.innerHTML = `<a class="voltar" href="#alunos">‹ Alunos</a>
      <div class="card ficha-topo">
        <span class="av g">${esc(iniciais(a.nome))}</span>
        <div class="quem"><h1>${esc(a.nome)}</h1><p class="muted" style="margin:4px 0 8px">${nomeFaixa(a.faixa)}${a.graus ? ` · ${a.graus}º grau` : ""} · aluno desde ${dataLonga(a.desde)}</p>
          ${devendo ? PILL_STATUS.inadimplente : PILL_STATUS[a.status]}</div>
        <div class="faixa-grande">${faixaSVG(a.faixa, a.graus)}</div>
        <div class="acoes-cab" style="display:flex;gap:8px"><button class="btn sec" id="editar">Editar</button>
          <button class="btn ${a.status === "ativo" ? "sec" : ""}" id="status">${a.status === "ativo" ? "Trancar matrícula" : "Reativar matrícula"}</button></div>
      </div>
      <div class="card dados">
        <div><small>Idade · categoria</small><b>${idade ? `${idade.idadeNoAno} anos · ${idade.nome}` : "—"}</b></div>
        <div><small>Peso · categoria</small><b>${a.peso ? `${String(a.peso).replace(".", ",")} kg · ${peso?.nome || "—"}` : "—"}</b></div>
        <div><small>Plano</small><b>${esc(a.plano)} · ${reais(a.valor)}</b></div>
        <div><small>Telefone</small><b>${esc(a.telefone || "—")}</b></div>
        <div><small>Na faixa desde</small><b>${dataLonga(a.desdeFaixa)}</b></div>
        <div><small>Última graduação</small><b>${dataLonga(a.ultimaGraduacao)}</b></div>
      </div>
      <div class="grade2">
        <div class="card"><div class="card-cab"><h3>Frequência</h3><small>últimos 30 dias</small></div>
          <div style="display:flex;align-items:center;gap:18px"><div class="anel">${anelClaroSVG(n30 / META_30_DIAS)}<b>${n30}<small>de ${META_30_DIAS} aulas</small></b></div>
          <p class="muted" style="margin:0">${n30 >= META_30_DIAS ? "Frequência excelente: 3 treinos por semana ou mais." : n30 >= 6 ? "Treinando com regularidade." : n30 ? "Frequência baixa: vale um contato." : "Sem treinos no último mês."}</p></div></div>
        <div class="card"><div class="card-cab"><h3>Próximo passo</h3><a class="link" href="#graduacoes">Graduações</a></div>
          <p style="margin:0 0 10px;font-weight:700">${proximo}</p>
          ${a.faixa !== "preta" ? `<div class="progresso ${apt.tipo ? "ok" : ""}"><i style="width:${Math.min(100, Math.round(apt.aulas / REGRAS.aulasPorGrau * 100))}%"></i></div>
          <small class="muted">${Math.min(apt.aulas, REGRAS.aulasPorGrau)} de ${REGRAS.aulasPorGrau} aulas desde a última graduação</small>` : ""}</div>
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
