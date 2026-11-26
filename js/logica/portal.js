// Portal do aluno: o que o painel copia para as coleções do portal (caminho A do desenho
// docs/superpowers/specs/2026-11-25-portal-aluno-design.md). Só o que cada aluno pode ver.
import { aptidao, regrasDe } from "./graduacao.js";
import { somarDias } from "./datas.js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Logo da academia (Configurações): imagem PNG/JPEG/WebP em data URL, até ~200 KB.
export const logoValida = l => (typeof l === "string" && l.length < 280000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(l) ? l : null);
const fotoDoRosto = mini => (typeof mini === "string" && mini.length < 20000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(mini) ? mini : null);

// Kids fica para depois: só adulto pode ter acesso ao portal.
export const podeTerAcesso = aluno => (aluno?.categoria || "adulto") === "adulto";

export function emailValido(texto) {
  const e = String(texto ?? "").trim().toLowerCase();
  return e.length <= 254 && EMAIL.test(e) ? e : null;
}

// Cópia do aluno: faixa, presenças (com horário e programa, para a aula continuar legível se a
// turma mudar) e o próximo passo da graduação. Nada de telefone, mensalidade ou dado de outros.
export function espelhoAluno(d, aluno, hojeISO) {
  const turmas = Object.fromEntries((d.turmas || []).map(t => [t.id, t]));
  const presencas = (d.checkins || []).filter(c => c.alunoId === aluno.id)
    .map(c => ({ data: c.data, turmaId: c.turmaId, hora: c.hora || "", horario: turmas[c.turmaId]?.horario || "", programa: turmas[c.turmaId]?.programa || "" }))
    .sort((x, y) => y.data.localeCompare(x.data) || y.hora.localeCompare(x.hora));
  return {
    nome: aluno.nome, nascimento: aluno.nascimento || null, sexo: ["M", "F"].includes(aluno.sexo) ? aluno.sexo : null,
    peso: Number.isFinite(Number(aluno.peso)) && aluno.peso != null && aluno.peso !== "" ? Number(aluno.peso) : null,
    telefone: aluno.telefone || "", plano: (d.planos || []).find(p => p.id === aluno.plano)?.nome || aluno.plano || "",
    // Foto do perfil = a miniatura do rosto cadastrado no GB Admin (só a imagem; os números do rosto não vão).
    foto: fotoDoRosto(d.rostos?.get?.(aluno.id)?.mini),
    faixa: aluno.faixa, graus: Number(aluno.graus) || 0,
    desdeFaixa: aluno.desdeFaixa || "", ultimaGraduacao: aluno.ultimaGraduacao || "",
    presencas, proximoPasso: aptidao(aluno, d.checkins || [], hojeISO),
    // Aulas da faixa até a próxima, pela regra da academia (Configurações): 4 graus + a troca de faixa.
    metaFaixa: aluno.faixa === "preta" ? null : regrasDe(aluno).aulasPorGrau * 5
  };
}

// E-mail do cadastro (é o login do aluno no portal): vazio pode; precisa ser válido e não ser de outro aluno.
export function problemaNoEmail(texto, alunoId, alunos) {
  if (!String(texto ?? "").trim()) return "";
  const email = emailValido(texto);
  if (!email) return "Confira o e-mail.";
  return (alunos || []).some(a => a.id !== alunoId && a.emailPortal === email) ? "Esse e-mail já é de outro aluno." : "";
}

export const espelhoAcesso = (aluno, email) => ({ alunoId: aluno.id, nome: aluno.nome, ativo: aluno.status === "ativo" });

// Grade do portal: só turmas adultas e só o que a tela do aluno usa (sem dado pessoal).
export function espelhoGrade(d) {
  const profs = Object.fromEntries((d.professores || []).map(p => [p.id, p.nome]));
  const turmas = {};
  for (const t of d.turmas || []) {
    if ((t.categoria || "adulto") !== "adulto") continue;
    turmas[t.id] = { diaSemana: t.diaSemana, horario: t.horario, programa: t.programa, professor: profs[t.professorId] || "", modeloAulaId: t.modeloAulaId || "", aula: t.aula || "", duracaoMin: Number(t.duracaoMin) || 60 };
  }
  return { turmas, cronograma: d.cronograma || [], ancoras: d.config?.ancoras || [], modelosAula: d.modelosAula || [],
    academia: { nome: d.config?.academia?.nome || "", logo: logoValida(d.config?.academia?.logo) } };
}

// Quem participou de cada aula adulta dos últimos DIAS_AULAS dias: id "turma_data" -> { turmaId, data, presentes }.
// Só os nomes (nada de telefone, faixa ou mensalidade), para o aluno ver a turma da aula no portal.
export const DIAS_AULAS = 30;
export function espelhoAulas(d, hojeISO) {
  const adultas = new Set((d.turmas || []).filter(t => (t.categoria || "adulto") === "adulto").map(t => t.id));
  const nomes = Object.fromEntries((d.alunos || []).map(a => [a.id, a.nome]));
  const desde = somarDias(hojeISO, -DIAS_AULAS), m = new Map();
  for (const c of d.checkins || []) {
    if (!adultas.has(c.turmaId) || c.data < desde || c.data > hojeISO || !nomes[c.alunoId]) continue;
    const id = `${c.turmaId}_${c.data}`;
    if (!m.has(id)) m.set(id, { turmaId: c.turmaId, data: c.data, presentes: [] });
    const lista = m.get(id).presentes;
    if (!lista.includes(nomes[c.alunoId])) lista.push(nomes[c.alunoId]);
  }
  for (const a of m.values()) a.presentes.sort((x, y) => x.localeCompare(y, "pt-BR"));
  return m;
}

// anterior: id -> JSON já gravado; novos: id -> objeto. Grava o que mudou e apaga o que sumiu.
export function mudancasEspelho(anterior, novos) {
  const gravar = [], apagar = [];
  for (const [id, obj] of novos) if (anterior.get(id) !== JSON.stringify(obj)) gravar.push([id, obj]);
  for (const id of anterior.keys()) if (!novos.has(id)) apagar.push(id);
  return { gravar, apagar };
}
