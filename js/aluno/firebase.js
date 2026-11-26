// Firebase do portal do aluno: o mesmo projeto do GB Admin, mas uma instância com nome próprio ("aluno").
// Assim a sessão do aluno fica separada da sessão do painel no mesmo navegador: entrar como aluno no
// /aluno não troca a conta do painel aberto em outra aba (o painel, ao ver uma conta que não é de admin,
// faria "Sair" e derrubaria o aluno junto).
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "../nuvem/config.js";

export const configurado = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
const app = configurado ? initializeApp(firebaseConfig, "aluno") : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
