// Portal do aluno: a mesma "interface" do dados.js do Diário de Tatame, mas lendo e gravando no banco
// do GB Admin. Grade, currículo e ciclo são da academia (só leitura); faixa e graus vêm do painel.
import * as n from "./nuvem.js";
import { aulaParaGravar } from "../logica/portal-diario.js";
import { idCheckinAluno } from "../logica/portal-checkin.js";

let aluno = null; // { alunoId, presente(turmaId, data) }
export const definirAluno = a => { aluno = a; };
const daAcademia = () => Promise.reject(new Error("A grade e o currículo são da academia: quem muda é o GB Admin."));

/* ---------- Perfil: metas, nascimento e sexo são do aluno (nome, faixa e graus vêm da academia) ---------- */
export function salvarPerfil(uid, parcial) {
  const p = {};
  if (Number.isInteger(parcial.metaSemanal)) p.metaSemanal = parcial.metaSemanal;
  if (Number.isInteger(parcial.metaAulasRoxa)) p.metaAulasRoxa = parcial.metaAulasRoxa;
  if ("nascimento" in parcial) p.nascimento = /^\d{4}-\d{2}-\d{2}$/.test(parcial.nascimento || "") ? parcial.nascimento : null;
  if ("sexo" in parcial) p.sexo = ["M", "F"].includes(parcial.sexo) ? parcial.sexo : null;
  return Object.keys(p).length ? n.salvarPreferencias(aluno.alunoId, p) : Promise.resolve();
}

/* ---------- Aulas: check-in novo grava a presença (checkinsAluno) e o diário; editar grava só o diário ---------- */
export async function salvarAula(uid, aula) {
  if (!aula.turmaId) throw new Error("Aula fora da grade ainda não entra no portal.");
  const texto = aulaParaGravar(aula);
  if (!texto) throw new Error("Anotações grandes demais.");
  if (!aula.id && aula.local?.verificado && !aluno.presente(aula.turmaId, aula.data)) {
    await n.fazerCheckin({ id: idCheckinAluno(aluno.alunoId, aula.turmaId, aula.data), alunoId: aluno.alunoId, turmaId: aula.turmaId,
      data: aula.data, hora: aula.horaCheckin || aula.horario, distancia: Math.min(100, Math.round(aula.local.distancia || 0)) });
  }
  await n.salvarDiario(aluno.alunoId, aula.turmaId, aula.data, texto);
  return `${aula.turmaId}_${aula.data}`;
}
// "Excluir" no portal apaga só as anotações: a presença é da academia.
export const excluirAula = (uid, id) => n.apagarDiario(aluno.alunoId, id);

/* ---------- Fotos: a foto da aula é a que a academia tirou ---------- */
const cacheFotos = new Map();
export async function lerFoto(uid, fotoId) {
  if (!String(fotoId || "").startsWith("aula:")) return null;
  if (cacheFotos.has(fotoId)) return cacheFotos.get(fotoId);
  const id = fotoId.slice(5), i = id.lastIndexOf("_");
  const f = await n.fotoDaAula(id.slice(0, i), id.slice(i + 1)).catch(() => null);
  cacheFotos.set(fotoId, f?.foto || null);
  return f?.foto || null;
}
export const salvarFoto = () => Promise.reject(new Error("A foto da aula vem da academia."));
export const excluirFoto = () => Promise.resolve();

/* ---------- Peso ---------- */
export const listarPesos = () => n.listarPesos(aluno.alunoId);
export const registrarPeso = (uid, peso) => n.registrarPeso(aluno.alunoId, peso);

/* ---------- Grade, currículo e ciclo: da academia ---------- */
export const chaveCurriculo = (programa, semana) => `${programa}-${semana}`;
export const salvarTurma = daAcademia, excluirTurma = daAcademia, salvarCurriculo = daAcademia, importarCurriculo = daAcademia, adicionarAncora = daAcademia;
