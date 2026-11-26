// Portal do aluno, lado do painel: grava o espelho (acessos, portal, portalGrade) e lê os check-ins dos alunos.
import {
  doc, getDocs, query, where, collection, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebase.js";


// Grava o que mudou e apaga o que sumiu, em lotes (o Firestore aceita até 500 por lote).
export async function gravarEspelho({ gravar, apagar }, colecao) {
  const ops = [...gravar.map(([id, obj]) => b => b.set(doc(db, colecao, id), obj)), ...apagar.map(id => b => b.delete(doc(db, colecao, id)))];
  for (let i = 0; i < ops.length; i += 400) {
    const lote = writeBatch(db);
    ops.slice(i, i + 400).forEach(op => op(lote));
    await lote.commit();
  }
}

export async function checkinsPendentes(desdeISO) {
  const s = await getDocs(query(collection(db, "checkinsAluno"), where("data", ">=", desdeISO)));
  // criadoEm vem do relógio do servidor (a regra exige): vira ms para a conferência do horário.
  return s.docs.map(d => { const x = d.data(); return { id: d.id, ...x, criadoEm: x.criadoEm?.toMillis?.() }; });
}

export async function apagarCheckinsAluno(ids) {
  for (let i = 0; i < ids.length; i += 400) {
    const lote = writeBatch(db);
    ids.slice(i, i + 400).forEach(id => lote.delete(doc(db, "checkinsAluno", id)));
    await lote.commit();
  }
}

export async function lerAcessos() {
  const s = await getDocs(collection(db, "acessos"));
  return s.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function lerAulas() {
  const s = await getDocs(collection(db, "portalAulas"));
  return s.docs.map(d => ({ id: d.id, ...d.data() }));
}
