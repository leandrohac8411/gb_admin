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
      if (dist <= LIMITE_DUVIDA) pares.push({ indice, alunoId: c.alunoId, dist });
    }
  });
  pares.sort((a, b) => a.dist - b.dist);
  const resultado = rostos.map((_, indice) => ({ indice, alunoId: null, distancia: null, estado: "desconhecido" }));
  const usados = new Set();
  for (const p of pares) {
    const r = resultado[p.indice];
    if (r.alunoId || usados.has(p.alunoId)) continue;
    usados.add(p.alunoId);
    Object.assign(r, { alunoId: p.alunoId, distancia: p.dist, estado: p.dist <= LIMITE_RECONHECIDO ? "reconhecido" : "duvida" });
  }
  return resultado;
}
