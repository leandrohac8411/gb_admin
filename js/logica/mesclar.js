import { toast } from "../ui/util.js";

// Junta os dados reais (Firestore) aos fictícios (navegador), para as telas lerem um só store.dados.
// Tudo que vem da nuvem leva real: true e NUNCA é gravado no localStorage (ver paraLocal).
const GUARDADAS = "_turmasFicticiasAdultas";
const copia = x => JSON.parse(JSON.stringify(x));
const slug = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "sem-nome";

export function mesclar(ficticios, reais) {
  const d = copia(ficticios);
  const turmasReais = (reais.turmas || []).filter(t => t.categoria === "adulto" || t.categoria === "kids");

  // Professores das turmas reais viram registros "reais" para as telas acharem o nome pelo professorId.
  const profs = new Map();
  for (const t of turmasReais) {
    const nome = String(t.professor || "").trim();
    if (nome && !profs.has(nome)) profs.set(nome, { id: `pr-${slug(nome)}`, nome, real: true });
  }
  d.professores = [...d.professores, ...profs.values()];

  // Com grade real adulta, as turmas adultas fictícias saem de cena (ficam guardadas para a demo).
  if (turmasReais.some(t => t.categoria === "adulto")) {
    d[GUARDADAS] = d.turmas.filter(t => t.categoria === "adulto");
    d.turmas = d.turmas.filter(t => t.categoria !== "adulto");
  }
  d.turmas = [...d.turmas, ...turmasReais.map(t => ({ ...t, professorId: profs.get(String(t.professor || "").trim())?.id || null, real: true }))];

  d.alunos = [...d.alunos, ...(reais.alunos || []).map(a => ({ ...a, real: true }))];
  d.checkins = [...d.checkins, ...(reais.checkins || []).map(c => ({ ...c, real: true }))];
  d.rostos = new Map((reais.rostos || []).map(r => [r.id, {
    descritores: ["d0", "d1", "d2"].map(k => r[k]).filter(Array.isArray), mini: r.mini || null, consentimento: r.consentimento
  }]));
  return d;
}

// O que pode ficar no navegador: só o fictício (e a grade fictícia adulta de volta).
export function paraLocal(dados) {
  const { rostos, [GUARDADAS]: guardadas, ...resto } = dados;
  const l = copia(resto);
  for (const [k, v] of Object.entries(l)) if (Array.isArray(v)) l[k] = v.filter(x => !(x && typeof x === "object" && x.real === true));
  if (guardadas) l.turmas = [...l.turmas, ...copia(guardadas)];
  return l;
}

// Grava na nuvem com aviso: nunca diz "salvo" se não salvou.
export async function salvarComAviso(promessa, mensagemOk, avisar = toast) {
  try { await promessa; if (mensagemOk) avisar(mensagemOk); return true; }
  catch (e) { console.error(e); avisar("Não salvou na nuvem: verifique a internet e tente de novo."); return false; }
}
