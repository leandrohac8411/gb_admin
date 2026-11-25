// Rosto no Firestore (coleção "rostos"). O resto dos dados do painel está em nuvem/painel.js.
import { doc, setDoc, deleteDoc, updateDoc, getDocs, query, where, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebase.js";
import { rostoNuvem } from "../logica/validar-nuvem.js";
import { fotoAulaNuvem, idFotoAula } from "../logica/foto-aula.js";

const invalido = () => Promise.reject(new Error("dado inválido"));

export function salvarRosto(alunoId, dados) {
  const r = rostoNuvem(dados);
  if (!r || typeof alunoId !== "string" || !alunoId) return invalido();
  return setDoc(doc(db, "rostos", alunoId), { ...r, atualizadoEm: serverTimestamp() });
}
export const apagarRosto = alunoId => deleteDoc(doc(db, "rostos", alunoId));

// Foto da aula (coleção "fotos"): uma por aula, lida por dia só quando a tela precisa.
export function salvarFotoAula(dados) {
  const f = fotoAulaNuvem(dados);
  if (!f) return invalido();
  return setDoc(doc(db, "fotos", idFotoAula(f.turmaId, f.data)), { ...f, atualizadoEm: serverTimestamp() });
}
export async function fotosDoDia(data) {
  const s = await getDocs(query(collection(db, "fotos"), where("data", "==", data)));
  return s.docs.map(d => ({ id: d.id, ...d.data() }));
}
export const legendaFotoAula = (id, legenda) => updateDoc(doc(db, "fotos", id), { legenda: String(legenda || "").trim().slice(0, 140), atualizadoEm: serverTimestamp() });
export const apagarFotoAula = id => deleteDoc(doc(db, "fotos", id));
