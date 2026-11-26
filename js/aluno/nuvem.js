// Portal do aluno: tudo o que o /aluno lê e grava no Firebase do GB Admin (regras em firestore.rules).
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, getDoc, setDoc, getDocs, onSnapshot, collection, query, where, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db, configurado } from "../nuvem/firebase.js";
import { idFotoAula } from "../logica/foto-aula.js";

export { configurado };
const limpo = e => String(e || "").trim().toLowerCase();

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

export async function lerAcesso(email) {
  const s = await getDoc(doc(db, "acessos", limpo(email)));
  return s.exists() ? s.data() : null;
}
export const ouvirPortal = (alunoId, cb, erro) => onSnapshot(doc(db, "portal", alunoId), s => cb(s.exists() ? s.data() : null), erro);
export const ouvirGrade = (cb, erro) => onSnapshot(doc(db, "portalGrade", "atual"), s => cb(s.exists() ? s.data() : null), erro);
export async function fotosDoDia(data) {
  const s = await getDocs(query(collection(db, "fotos"), where("data", "==", data)));
  return s.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function fotoDaAula(turmaId, data) {
  const s = await getDoc(doc(db, "fotos", idFotoAula(turmaId, data)));
  return s.exists() ? s.data() : null;
}
export const ouvirDiario = (alunoId, cb, erro) => onSnapshot(collection(db, "diarios", alunoId, "aulas"), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))), erro);
export const salvarDiario = (alunoId, turmaId, data, dados) =>
  setDoc(doc(db, "diarios", alunoId, "aulas", idFotoAula(turmaId, data)), { ...dados, turmaId, data, atualizadoEm: serverTimestamp() });
export const fazerCheckin = ({ id, ...dados }) => setDoc(doc(db, "checkinsAluno", id), { ...dados, criadoEm: serverTimestamp() });
export const meusCheckins = (alunoId, cb, erro) => onSnapshot(query(collection(db, "checkinsAluno"), where("alunoId", "==", alunoId)), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))), erro);
