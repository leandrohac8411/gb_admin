// Rosto no Firestore (coleção "rostos"). O resto dos dados do painel está em nuvem/painel.js.
import { doc, setDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebase.js";
import { rostoNuvem } from "../logica/validar-nuvem.js";

const invalido = () => Promise.reject(new Error("dado inválido"));

export function salvarRosto(alunoId, dados) {
  const r = rostoNuvem(dados);
  if (!r || typeof alunoId !== "string" || !alunoId) return invalido();
  return setDoc(doc(db, "rostos", alunoId), { ...r, atualizadoEm: serverTimestamp() });
}
export const apagarRosto = alunoId => deleteDoc(doc(db, "rostos", alunoId));
