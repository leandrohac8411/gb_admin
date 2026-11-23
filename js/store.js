// Guarda a academia fictícia no navegador. Se não houver localStorage (ou ele falhar),
// o painel funciona só em memória.
import { gerarDados, VERSAO, COLECOES } from "./dados-ficticios.js";
import { faixaValida } from "./ui/faixa.js";

const CHAVE = `gb-admin:v${VERSAO}`;

// Estrutura mínima de uma academia válida (usada também para importar backup).
export function validarDados(d) {
  return !!d && typeof d === "object" && d.versao === VERSAO && COLECOES.every(c => Array.isArray(d[c])) && !!d.config && typeof d.config === "object";
}

const DATA = /^\d{4}-\d{2}-\d{2}$/, HORA = /^\d{2}:\d{2}$/, MES = /^\d{4}-\d{2}$/;
const texto = v => typeof v === "string";
const nota = v => Number.isInteger(v) && v >= 1 && v <= 5;
const grausOk = g => g == null || (Number.isInteger(g) && g >= 0 && g <= 10);
const objeto = x => !!x && typeof x === "object" && !Array.isArray(x);

// Backup importado: tira registros malformados (que quebrariam telas) e marca como importado.
export function limparImportado(d) {
  const ok = {
    alunos: a => texto(a?.id) && texto(a.nome) && faixaValida(a.faixa) && grausOk(a.graus)
      && ["ativo", "trancado"].includes(a.status) && (a.categoria == null || ["adulto", "kids"].includes(a.categoria)) && (!a.nascimento || DATA.test(a.nascimento)) && DATA.test(a.desde || "") && DATA.test(a.ultimaGraduacao || "") && DATA.test(a.desdeFaixa || ""),
    turmas: t => texto(t?.id) && Number.isInteger(t.diaSemana) && HORA.test(t.horario || "") && texto(t.programa),
    checkins: c => texto(c?.alunoId) && texto(c.turmaId) && DATA.test(c.data || "") && HORA.test(c.hora || ""),
    mensalidades: m => texto(m?.alunoId) && MES.test(m.competencia || "") && DATA.test(m.vencimento || "") && Number.isFinite(Number(m.valor)) && (m.pagoEm == null || DATA.test(m.pagoEm)),
    despesas: x => texto(x?.id) && DATA.test(x.data || "") && texto(x.descricao) && texto(x.categoria) && Number.isFinite(Number(x.valor)),
    eventos: e => texto(e?.id) && texto(e.titulo) && DATA.test(e.data || "") && HORA.test(e.hora || "") && Number.isInteger(e.vagas) && Array.isArray(e.inscritos),
    avaliacoes: v => texto(v?.alunoId) && MES.test(v.mes || "") && v.notas && ["respeito", "disciplina", "atencao", "coleguismo"].every(c => nota(v.notas[c])),
    graduacoes: g => texto(g?.alunoId) && DATA.test(g.data || "") && faixaValida(g.faixa) && grausOk(g.graus),
    professores: p => texto(p?.id) && texto(p.nome) && (p.faixa == null || faixaValida(p.faixa)) && grausOk(p.graus),
    habilidades: h => texto(h?.id) && texto(h.nome) && (h.faixaMin == null || faixaValida(h.faixaMin)),
    fotosAula: f => texto(f?.id) && texto(f.turmaId) && DATA.test(f.data || "") && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(f.foto || "")
  };
  for (const [col, f] of Object.entries(ok)) d[col] = (d[col] || []).filter(f);
  // Demais coleções: só registros que são objetos (lixo como números/textos soltos sai).
  for (const col of COLECOES) if (!ok[col]) d[col] = (d[col] || []).filter(objeto);
  // Endereço do Diário só https (nada de "javascript:" num link).
  if (d.config && d.config.diarioUrl && !/^https:\/\/[^\s"'<>]+$/.test(String(d.config.diarioUrl))) delete d.config.diarioUrl;
  d.importado = true;
  return d;
}

// Dados de outro mês são refeitos: a vitrine sempre mostra o mês atual "vivo".
function ler(armazenamento, hojeISO) {
  try {
    const bruto = armazenamento?.getItem(CHAVE);
    if (!bruto) return null;
    const d = JSON.parse(bruto);
    return validarDados(d) && (d.importado || String(d.geradoEm || "").slice(0, 7) === hojeISO.slice(0, 7)) ? d : null;
  } catch { return null; }
}

export function criarStore(hojeISO, armazenamento = globalThis.localStorage) {
  let contador = 0;
  // Versões antigas da vitrine não servem mais: limpa para não ocupar espaço.
  try { for (let v = 1; v < VERSAO; v++) armazenamento?.removeItem?.(`gb-admin:v${v}`); } catch { /* ignora */ }
  const store = {
    dados: ler(armazenamento, hojeISO) || gerarDados(hojeISO),
    salvar() {
      // false = não coube no navegador (ou armazenamento bloqueado): os dados seguem só em memória.
      try { if (!armazenamento) return false; armazenamento.setItem(CHAVE, JSON.stringify(store.dados)); return true; } catch { return false; }
    },
    restaurar(hoje = hojeISO) {
      store.dados = gerarDados(hoje);
      store.salvar();
    },
    novoId(prefixo) {
      return `${prefixo}${Date.now().toString(36)}${(contador++).toString(36)}`;
    }
  };
  return store;
}
