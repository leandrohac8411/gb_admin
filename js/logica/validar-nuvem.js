// O que pode ir para o banco (Firestore). Tudo passa por aqui antes de gravar:
// só campos conhecidos, tipos certos e textos com tamanho máximo. As regras do
// Firestore repetem estas checagens do lado do servidor.
import { faixaValida } from "../ui/faixa.js";
import { descritorValido } from "./reconhecimento.js";

const DATA = /^\d{4}-\d{2}-\d{2}$/, HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const MINI = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/;
const objeto = x => !!x && typeof x === "object" && !Array.isArray(x);
const corta = (s, max) => String(s ?? "").trim().slice(0, max);
const dataOk = s => typeof s === "string" && DATA.test(s);

export function alunoNuvem(a) {
  if (!objeto(a) || !corta(a.nome, 80) || !faixaValida(a.faixa)) return null;
  if (!["ativo", "trancado"].includes(a.status) || !["adulto", "kids"].includes(a.categoria)) return null;
  if (!(Number.isInteger(a.graus) && a.graus >= 0 && a.graus <= 10)) return null;
  if (![a.desde, a.desdeFaixa, a.ultimaGraduacao].every(dataOk) || (a.nascimento && !dataOk(a.nascimento))) return null;
  const r = {
    nome: corta(a.nome, 80), faixa: a.faixa, graus: a.graus, categoria: a.categoria, status: a.status,
    desde: a.desde, desdeFaixa: a.desdeFaixa, ultimaGraduacao: a.ultimaGraduacao, real: true
  };
  if (a.nascimento) r.nascimento = a.nascimento;
  if (a.telefone) r.telefone = corta(a.telefone, 30);
  if (a.sexo === "M" || a.sexo === "F") r.sexo = a.sexo;
  return r;
}

export function rostoNuvem({ descritores, mini, consentimento } = {}) {
  if (!Array.isArray(descritores) || descritores.length < 1 || descritores.length > 3 || !descritores.every(descritorValido)) return null;
  const c = consentimento;
  if (!objeto(c) || typeof c.por !== "string" || c.por.trim().length < 2 || c.por.length > 80 || typeof c.responsavel !== "boolean" || !dataOk(c.data)) return null;
  if (mini != null && (typeof mini !== "string" || mini.length >= 20000 || !MINI.test(mini))) return null;
  const r = { consentimento: { por: c.por.trim(), responsavel: c.responsavel, data: c.data } };
  descritores.forEach((d, i) => { r[`d${i}`] = d; });
  if (mini) r.mini = mini;
  return r;
}

export function checkinNuvem(c) {
  if (!objeto(c) || typeof c.alunoId !== "string" || !c.alunoId || c.alunoId.length > 64) return null;
  if (typeof c.turmaId !== "string" || !c.turmaId || c.turmaId.length > 64) return null;
  if (!dataOk(c.data) || !HORA.test(c.hora || "") || !["manual", "foto", "rosto"].includes(c.origem)) return null;
  return { alunoId: c.alunoId, turmaId: c.turmaId, data: c.data, hora: c.hora, origem: c.origem };
}

export function turmaNuvem(t) {
  if (!objeto(t) || !Number.isInteger(t.diaSemana) || t.diaSemana < 0 || t.diaSemana > 6 || !HORA.test(t.horario || "")) return null;
  if (!["adulto", "kids"].includes(t.categoria) || !(Number.isInteger(t.duracaoMin) && t.duracaoMin >= 1 && t.duracaoMin <= 600)) return null;
  return { diaSemana: t.diaSemana, horario: t.horario, programa: corta(t.programa, 20), professor: corta(t.professor, 80), duracaoMin: t.duracaoMin, categoria: t.categoria };
}
