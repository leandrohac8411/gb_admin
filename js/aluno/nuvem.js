// Portal do aluno: tudo o que o /aluno lê e grava no Firebase do GB Admin (regras em firestore.rules).
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, getDoc, setDoc, addDoc, deleteDoc, getDocs, onSnapshot, collection, query, where, orderBy, limit, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db, configurado } from "./firebase.js";

export { configurado };
const limpo = e => String(e || "").trim().toLowerCase();
const idAula = (turmaId, data) => `${turmaId}_${data}`;

/* ---------- Login ---------- */
export const entrar = (email, senha) => signInWithEmailAndPassword(auth, limpo(email), senha);
export async function criarConta(email, senha) {
  const c = await createUserWithEmailAndPassword(auth, limpo(email), senha);
  await sendEmailVerification(c.user);
  return c.user;
}
export const reenviarVerificacao = () => sendEmailVerification(auth.currentUser);
// Depois de confirmar o e-mail, o "crachá" do login precisa ser renovado para o banco saber.
export async function conferirVerificacao() {
  await auth.currentUser.reload();
  await auth.currentUser.getIdToken(true);
  return auth.currentUser.emailVerified;
}
export const esqueciSenha = email => sendPasswordResetEmail(auth, limpo(email));
export const sair = () => signOut(auth);
export const aoMudarUsuario = cb => onAuthStateChanged(auth, cb);
export const usuarioAtual = () => auth.currentUser;

/* ---------- O que vem do GB Admin (espelho) ---------- */
export async function lerAcesso(email) {
  const s = await getDoc(doc(db, "acessos", limpo(email)));
  return s.exists() ? s.data() : null;
}
export const ouvirPortal = (alunoId, cb, erro) => onSnapshot(doc(db, "portal", alunoId), s => cb(s.exists() ? s.data() : null), erro);
export const ouvirGrade = (cb, erro) => onSnapshot(doc(db, "portalGrade", "atual"), s => cb(s.exists() ? s.data() : null), erro);
export async function fotoDaAula(turmaId, data) {
  const s = await getDoc(doc(db, "fotos", idAula(turmaId, data)));
  return s.exists() ? s.data() : null;
}

/* ---------- Do aluno: diário (cada aula num texto JSON), metas, peso e check-in ---------- */
export const ouvirDiario = (alunoId, cb, erro) => onSnapshot(collection(db, "diarios", alunoId, "aulas"), s => cb(s.docs.map(d => {
  const x = d.data();
  let aula = {};
  try { aula = JSON.parse(x.aula || "{}"); } catch { /* texto estragado: fica sem as anotações */ }
  return { ...aula, id: d.id, turmaId: x.turmaId, data: x.data };
})), erro);
export const salvarDiario = (alunoId, turmaId, data, texto) =>
  setDoc(doc(db, "diarios", alunoId, "aulas", idAula(turmaId, data)), { turmaId, data, aula: texto, atualizadoEm: serverTimestamp() });
export const apagarDiario = (alunoId, aulaId) => deleteDoc(doc(db, "diarios", alunoId, "aulas", aulaId));

export const ouvirPreferencias = (alunoId, cb, erro) => onSnapshot(doc(db, "diarios", alunoId), s => cb(s.exists() ? s.data() : {}), erro);
export const salvarPreferencias = (alunoId, parcial) => setDoc(doc(db, "diarios", alunoId), parcial, { merge: true });

export async function listarPesos(alunoId) {
  const s = await getDocs(query(collection(db, "diarios", alunoId, "pesos"), orderBy("data", "desc"), limit(20)));
  return s.docs.map(d => ({ id: d.id, ...d.data() }));
}
export const registrarPeso = (alunoId, { data, kg }) => addDoc(collection(db, "diarios", alunoId, "pesos"), { data, kg });

export const fazerCheckin = ({ id, ...dados }) => setDoc(doc(db, "checkinsAluno", id), { ...dados, criadoEm: serverTimestamp() });
export const meusCheckins = (alunoId, cb, erro) => onSnapshot(query(collection(db, "checkinsAluno"), where("alunoId", "==", alunoId)), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))), erro);
// Quem participou de uma aula (espelho do painel, últimos 30 dias).
export async function presentesDaAula(turmaId, data) {
  const s = await getDoc(doc(db, "portalAulas", idAula(turmaId, data)));
  return s.exists() ? s.data().presentes || [] : null;
}
