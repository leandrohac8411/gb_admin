// Reconhecimento de rostos: compara "descritores" (128 números que a face-api tira de cada rosto).
// Não guarda nem compara fotos: só números. Quanto menor a distância, mais parecidos os rostos.
// Limites calibrados com fotos reais: pessoas diferentes chegaram a 0,49, então 0,45 é o teto do "reconhecido".
export const LIMITE_RECONHECIDO = 0.45;
export const LIMITE_DUVIDA = 0.55;
const TAMANHO = 128;

// 4 casas decimais bastam para comparar e deixam o documento no banco bem menor.
export const compactar = descritor => Array.from(descritor, n => Math.round(n * 1e4) / 1e4);

export const descritorValido = d =>
  Array.isArray(d) && d.length === TAMANHO && d.every(n => typeof n === "number" && Number.isFinite(n) && n >= -1 && n <= 1);

export function distancia(a, b) {
  let s = 0;
  for (let i = 0; i < TAMANHO; i++) { const x = a[i] - b[i]; s += x * x; }
  return Math.sqrt(s);
}

// Documento de "rostos" no banco: até 3 descritores em d0, d1, d2.
export const descritoresDoRosto = doc =>
  !doc || typeof doc !== "object" ? [] : ["d0", "d1", "d2"].map(k => doc[k]).filter(descritorValido);

// Um resultado por rosto da foto, na mesma ordem. Cada aluno fica com no máximo um rosto:
// os pares mais parecidos são atribuídos primeiro.
export function reconhecer(rostos, cadastrados) {
  const pares = [];
  rostos.forEach((r, indice) => {
    for (const c of cadastrados) {
      if (!c.descritores?.length) continue;
      const dist = Math.min(...c.descritores.map(d => distancia(r, d)));
      if (dist <= LIMITE_DUVIDA) pares.push({ indice, alunoId: c.alunoId, professor: !!c.professor, dist });
    }
  });
  pares.sort((a, b) => a.dist - b.dist);
  const resultado = rostos.map((_, indice) => ({ indice, alunoId: null, professor: false, distancia: null, estado: "desconhecido" }));
  const usados = new Set();
  for (const p of pares) {
    const r = resultado[p.indice];
    if (r.alunoId || usados.has(p.alunoId)) continue;
    usados.add(p.alunoId);
    Object.assign(r, { alunoId: p.alunoId, professor: p.professor, distancia: p.dist, estado: p.dist <= LIMITE_RECONHECIDO ? "reconhecido" : "duvida" });
  }
  return resultado;
}

// Quem pode ser reconhecido: aluno ativo que ainda existe e professor da equipe, com pelo menos um descritor.
// O rosto do professor fica na mesma coleção, com o id do professor (alunoId aqui é "id da pessoa").
export function cadastradosDe({ alunos, professores = [], rostos }) {
  if (!(rostos instanceof Map)) return [];
  const ativos = new Set(alunos.filter(a => a.status === "ativo").map(a => a.id));
  const profs = new Set(professores.map(p => p.id));
  return [...rostos].filter(([id, r]) => (ativos.has(id) || profs.has(id)) && r.descritores?.length)
    .map(([alunoId, r]) => profs.has(alunoId) ? { alunoId, descritores: r.descritores, professor: true } : { alunoId, descritores: r.descritores });
}

// Quantos alunos da foto ainda não têm nome: rostos sem aluno marcado e que não são professor.
// Se nenhum professor foi reconhecido mas ele está na foto, desconta 1.
export function alunosSemRosto(escolhas, idsProfessores, professorNaFoto) {
  const prof = e => e.alunoId && idsProfessores.has(e.alunoId);
  const restantes = escolhas.filter(e => !prof(e) && !(e.marcado && e.alunoId)).length;
  return Math.max(0, restantes - (professorNaFoto && !escolhas.some(prof) ? 1 : 0));
}

// Como cada rosto começa na tela de conferência.
// O professor aparece com o nome, mas não vira presença.
export const escolhaInicial = r => ({ alunoId: r.alunoId || "", marcado: r.estado === "reconhecido" && !r.professor });

// Rosto confirmado na foto da aula vira referência: a do cadastro fica e entram as 2 mais recentes da aula.
// Assim o reconhecimento passa a comparar com rostos de longe, na mesma luz do tatame.
export function aprenderDescritor(descritores, novo) {
  if (!descritorValido(novo)) return descritores;
  if (!descritores.length) return [novo];
  return [descritores[0], ...descritores.slice(1), novo].filter((_, i, l) => i === 0 || i >= l.length - 2);
}
