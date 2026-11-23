// Configuração do Firebase do GB Admin (projeto separado do Diário).
// Esses dados NÃO são secretos: quem protege os dados são as regras em firestore.rules.
export const firebaseConfig = {
  apiKey: "AIzaSyCCRUq-P8RuI-mjzTPLwRUk-uy_AzoMf0Q",
  authDomain: "gbadmin-48ff9.firebaseapp.com",
  projectId: "gbadmin-48ff9",
  storageBucket: "gbadmin-48ff9.firebasestorage.app",
  messagingSenderId: "961926716415",
  appId: "1:961926716415:web:4eb3a61a35051fd4e5e5ca"
};

// Só estes e-mails entram (em minúsculas). Use os MESMOS em firestore.rules.
export const USERS = {
  "leandrohacarvalho@gmail.com": { nome: "Leandro", sexo: "M" },
  "strandrade@gmail.com": { nome: "Stephany", sexo: "F" }
};
