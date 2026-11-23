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
  // Tudo que fala de um aluno real (graduação, anotação, mensalidade, inscrição...) também sai.
  const reaisIds = new Set((l.alunos || []).filter(a => a?.real === true).map(a => a.id));
  const ligadoAReal = x => x && typeof x === "object" && (x.real === true || reaisIds.has(x.alunoId));
  for (const [k, v] of Object.entries(l)) {
    if (!Array.isArray(v)) continue;
    l[k] = v.filter(x => !ligadoAReal(x));
    for (const x of l[k]) if (x && Array.isArray(x.inscritos)) x.inscritos = x.inscritos.filter(id => !reaisIds.has(id));
  }
  if (guardadas) l.turmas = [...l.turmas, ...copia(guardadas)];
  return l;
}

// Grava na nuvem com aviso: nunca diz "salvo" se não salvou.
// Sem internet, o Firestore guarda a gravação no aparelho e só responde quando a conexão volta.
// Não dá para esperar isso com a tela travada: depois do prazo, a gravação segue "na fila".
export function comPrazo(promessa, ms = 8000) {
  let timer;
  const prazo = new Promise(ok => { timer = setTimeout(() => ok("fila"), ms); });
  return Promise.race([Promise.resolve(promessa).then(() => "ok"), prazo]).finally(() => clearTimeout(timer));
}

export async function salvarComAviso(promessa, mensagemOk, avisar = toast, ms = 8000) {
  try {
    if (await comPrazo(promessa, ms) === "fila") { avisar("Salvo no aparelho: vai para a nuvem quando a internet voltar."); return true; }
    if (mensagemOk) avisar(mensagemOk); return true;
  }
  catch (e) {
    console.error(e);
    avisar(e?.code === "permission-denied" || e?.code === "unauthenticated"
      ? "Não salvou: o banco recusou (sem permissão). Confira se as regras do Firebase estão publicadas; se estão, saia e entre de novo."
      : e?.message === "dado inválido" ? "Não salvou: algum dado está fora do formato esperado."
      : "Não salvou na nuvem: verifique a internet e tente de novo.");
    return false;
  }
}
