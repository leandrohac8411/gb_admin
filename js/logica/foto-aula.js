// Foto da aula no painel logado: fica na coleção "fotos" do Firestore, um documento por aula
// (turma + dia), separada do painel para não estourar o limite de 1 MB dos documentos de lá.
// Ela só é guardada se todas as crianças marcadas na foto tiverem autorização de uso de imagem.
export const LIMITE_FOTO = 360_000; // caracteres do data URL (~270 KB de JPEG)
const DATA = /^\d{4}-\d{2}-\d{2}$/, ID = /^[A-Za-z0-9-]{1,60}$/, JPEG = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/;

export const idFotoAula = (turmaId, data) => `${turmaId}_${data}`;

// Nomes das crianças da foto sem autorização de imagem (adulto não tem esse campo no cadastro).
export function semAutorizacao(ids, alunosPorId) {
  return ids.map(id => alunosPorId[id]).filter(a => a && a.categoria === "kids" && a.autorizaImagem !== true).map(a => a.nome);
}

export function fotoAulaNuvem(x) {
  if (!x || !ID.test(x.turmaId || "") || !DATA.test(x.data || "")) return null;
  if (typeof x.foto !== "string" || x.foto.length >= LIMITE_FOTO || !JPEG.test(x.foto)) return null;
  const r = { turmaId: x.turmaId, data: x.data, foto: x.foto, legenda: String(x.legenda || "").trim().slice(0, 140) };
  if (typeof x.professorId === "string" && x.professorId) r.professorId = x.professorId.slice(0, 60);
  return r;
}
