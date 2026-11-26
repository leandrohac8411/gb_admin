// Página do evento: graduação (quem troca de faixa, quem pega grau), campeonato (categorias e medalhas)
// e confraternização (acompanhantes e pagamento). Os dados de cada participante ficam em ev.detalhes[alunoId].
import { aptidao, idadeEm, ehKids } from "./graduacao.js";
import { categoriaIdade, categoriaPeso } from "./categorias.js";
import { nomeFaixa } from "../ui/faixa.js";

export const MEDALHAS = { ouro: "Ouro", prata: "Prata", bronze: "Bronze", participou: "Participou" };
export const EMOJI_MEDALHA = { ouro: "🥇", prata: "🥈", bronze: "🥉", participou: "🎽" };

export function detalhe(ev, alunoId) {
  if (!ev.detalhes || typeof ev.detalhes !== "object") ev.detalhes = {};
  if (!ev.detalhes[alunoId]) ev.detalhes[alunoId] = {};
  return ev.detalhes[alunoId];
}
const lerDetalhe = (ev, id) => ev.detalhes?.[id] || {};
const porNome = (a, b) => a.aluno.nome.localeCompare(b.aluno.nome, "pt-BR");

export function gruposGraduacao(ev, alunos, checkins, hoje) {
  const mapa = new Map(alunos.map(a => [a.id, a]));
  const feitos = new Map((ev.graduados || []).map(g => [g.alunoId, g]));
  const g = { faixa: [], grau: [], naoAptos: [], graduados: [] };
  for (const id of ev.inscritos || []) {
    const aluno = mapa.get(id);
    if (!aluno) continue;
    if (feitos.has(id)) { g.graduados.push({ aluno, ...feitos.get(id) }); continue; }
    const apt = aptidao(aluno, checkins, hoje);
    if (apt.tipo === "faixa") g.faixa.push({ aluno, proxima: apt.proximaFaixa });
    else if (apt.tipo === "grau") g.grau.push({ aluno, proximoGrau: (Number(aluno.graus) || 0) + 1 });
    else g.naoAptos.push({ aluno, faltamAulas: apt.faltamAulas });
  }
  Object.values(g).forEach(l => l.sort(porNome));
  return g;
}

// escolhas: [{ id, tipo: "grau" | "faixa", proxima? }]. Devolve quantos foram graduados agora.
export function aplicarGraduacoes(d, ev, escolhas, hoje) {
  ev.graduados = Array.isArray(ev.graduados) ? ev.graduados : [];
  let n = 0;
  for (const e of escolhas) {
    const a = d.alunos.find(x => x.id === e.id);
    if (!a || ev.graduados.some(g => g.alunoId === a.id)) continue;
    if (e.tipo === "faixa" && e.proxima) Object.assign(a, { faixa: e.proxima, graus: 0, desdeFaixa: hoje });
    else if (e.tipo === "grau" && (Number(a.graus) || 0) < 4) a.graus = (Number(a.graus) || 0) + 1;
    else continue;
    a.ultimaGraduacao = hoje;
    const reg = { alunoId: a.id, data: hoje, faixa: a.faixa, graus: a.graus };
    d.graduacoes.push(ev.id ? { ...reg, eventoId: ev.id } : reg);
    ev.graduados.push({ alunoId: a.id, tipo: e.tipo, faixa: a.faixa, graus: a.graus });
    n++;
  }
  return n;
}

export function categoriaSugerida(aluno, hoje) {
  const partes = [nomeFaixa(aluno.faixa)];
  if (ehKids(aluno)) {
    const idade = idadeEm(aluno.nascimento, hoje);
    if (idade != null) partes.push(`${idade} anos`);
  } else {
    const ci = categoriaIdade(aluno.nascimento, hoje), cp = aluno.peso ? categoriaPeso(aluno.peso, aluno.sexo) : null;
    if (ci) partes.push(ci.nome);
    if (cp) partes.push(cp.nome);
  }
  return partes.filter(Boolean).join(" · ");
}

export const categoriaDe = (ev, aluno, hoje) => lerDetalhe(ev, aluno.id).categoria || categoriaSugerida(aluno, hoje);

// Um grupo por faixa (adultos na ordem das faixas, depois kids pela cor), e dentro dele
// os atletas ordenados pela categoria: quem disputa a mesma categoria fica junto.
const ORDEM_ADULTO = ["branca", "azul", "roxa", "marrom", "preta"], ORDEM_KIDS = ["branca", "cinza", "amarela", "laranja", "verde"];
export function gruposCampeonato(ev, alunos, hoje) {
  const grupos = new Map();
  for (const id of ev.inscritos || []) {
    const a = alunos[id];
    if (!a) continue;
    const cor = String(a.faixa || "").split("-")[0], kids = ehKids(a);
    const chave = kids ? `k${ORDEM_KIDS.indexOf(cor)}` : `a${ORDEM_ADULTO.indexOf(cor)}`;
    if (!grupos.has(chave)) grupos.set(chave, { chave, titulo: `${kids ? "Kids · " : ""}${nomeFaixa(cor)}`, atletas: [] });
    grupos.get(chave).atletas.push({ aluno: a, categoria: categoriaDe(ev, a, hoje) });
  }
  const ordem = c => (c[0] === "a" ? 0 : 100) + Number(c.slice(1));
  return [...grupos.values()].sort((x, y) => ordem(x.chave) - ordem(y.chave)).map(({ titulo, atletas }) => ({
    titulo, atletas: atletas.sort((x, y) => x.categoria.localeCompare(y.categoria, "pt-BR") || x.aluno.nome.localeCompare(y.aluno.nome, "pt-BR"))
  }));
}

export function medalhasDoAluno(eventos, alunoId) {
  return (eventos || []).filter(ev => ev.tipo === "Campeonato" && (ev.inscritos || []).includes(alunoId))
    .map(ev => ({ eventoId: ev.id, titulo: ev.titulo, data: ev.data, ...lerDetalhe(ev, alunoId) }))
    .filter(m => ["ouro", "prata", "bronze"].includes(m.medalha))
    .map(({ eventoId, titulo, data, medalha, categoria }) => ({ eventoId, titulo, data, medalha, categoria }))
    .sort((a, b) => b.data.localeCompare(a.data));
}

export function quadroMedalhas(ev) {
  const q = { ouro: 0, prata: 0, bronze: 0 };
  for (const id of ev.inscritos || []) { const m = lerDetalhe(ev, id).medalha; if (m in q) q[m]++; }
  return q;
}

export const temMedalhas = ev => ev.tipo === "Campeonato" && Object.values(quadroMedalhas(ev)).some(n => n > 0);

export function resumoConfra(ev) {
  const valor = Number(ev.valorPessoa) || 0;
  let pessoas = 0, pagos = 0, recebido = 0, falta = 0;
  for (const id of ev.inscritos || []) {
    const x = lerDetalhe(ev, id), grupo = 1 + Math.max(0, Math.floor(Number(x.acompanhantes) || 0));
    pessoas += grupo;
    if (x.pago) { pagos++; recebido += grupo * valor; } else falta += grupo * valor;
  }
  return { pessoas, pagos, recebido, falta };
}
