// Leitura e gravação no Firestore. Toda gravação passa antes pelo validador de validar-nuvem.js.
import {
  collection, doc, onSnapshot, addDoc, setDoc, deleteDoc, writeBatch, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebase.js";
import { alunoNuvem, rostoNuvem, checkinNuvem, turmaNuvem } from "../logica/validar-nuvem.js";

const COLECOES = ["alunos", "rostos", "turmas", "checkins"];
const invalido = () => Promise.reject(new Error("dado inválido"));

// Escuta as 4 coleções e entrega tudo junto, só depois que todas responderam pela 1ª vez.
export function ouvirTudo(cb, erro) {
  const atual = {}, prontas = new Set();
  const parar = COLECOES.map(nome => onSnapshot(collection(db, nome), snap => {
    atual[nome] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    prontas.add(nome);
    if (prontas.size === COLECOES.length) cb({ ...atual });
  }, erro));
  return () => parar.forEach(p => p());
}

export async function salvarAluno(a) {
  const dados = alunoNuvem(a);
  if (!dados) return invalido();
  if (a.id && a.real) { await setDoc(doc(db, "alunos", a.id), dados); return a.id; }
  return (await addDoc(collection(db, "alunos"), dados)).id;
}

export async function apagarAluno(id) {
  const lote = writeBatch(db);
  lote.delete(doc(db, "alunos", id));
  lote.delete(doc(db, "rostos", id));
  await lote.commit();
}

export function salvarRosto(alunoId, dados) {
  const r = rostoNuvem(dados);
  if (!r || typeof alunoId !== "string" || !alunoId) return invalido();
  return setDoc(doc(db, "rostos", alunoId), { ...r, atualizadoEm: serverTimestamp() });
}
export const apagarRosto = alunoId => deleteDoc(doc(db, "rostos", alunoId));

export async function salvarCheckin(c) {
  const dados = checkinNuvem(c);
  if (!dados) return invalido();
  return (await addDoc(collection(db, "checkins"), dados)).id;
}
export const apagarCheckin = id => deleteDoc(doc(db, "checkins", id));

// Grava a grade inteira de uma vez. ID fixo por dia e horário: importar de novo não duplica.
export async function salvarTurmas(turmas) {
  const validas = turmas.map(turmaNuvem);
  if (!validas.length || validas.some(t => !t)) return invalido();
  const lote = writeBatch(db);
  for (const t of validas) lote.set(doc(db, "turmas", `d-${t.diaSemana}-${t.horario.replace(":", "")}`), t);
  await lote.commit();
  return validas.length;
}
