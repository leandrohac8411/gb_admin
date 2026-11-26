// Portal do aluno (/aluno): mensagens do login em português (as telas são as do Diário de Tatame,
// e os dados são montados em portal-diario.js).
const ERROS = {
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/wrong-password": "E-mail ou senha incorretos.",
  "auth/user-not-found": "E-mail ou senha incorretos.",
  "auth/invalid-email": "Confira o e-mail.",
  "auth/email-already-in-use": "Esse e-mail já tem conta. Toque em Entrar ou em Esqueci a senha.",
  "auth/weak-password": "A senha precisa ter pelo menos 8 caracteres.",
  "auth/password-does-not-meet-requirements": "A senha precisa ter pelo menos 8 caracteres.",
  "auth/too-many-requests": "Muitas tentativas. Espere um pouco e tente de novo.",
  "auth/network-request-failed": "Sem internet. Confira a conexão e tente de novo."
};
export const mensagemDeErroLogin = code => ERROS[code] || "Não deu para entrar. Tente de novo.";
