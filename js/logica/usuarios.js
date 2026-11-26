// Saudação do painel: o usuário que entrou (pelo e-mail do login) em Permissões › Usuários dá o nome e o
// "Bem-vindo/Bem-vinda". Sem cadastro lá, vale o padrão (nome da lista de admins da configuração do login).
export function usuarioDaSaudacao(usuarios, email, padrao) {
  const e = String(email || "").trim().toLowerCase();
  const u = e ? (usuarios || []).find(x => String(x.email || "").toLowerCase() === e) : null;
  if (u) return { nome: u.nome || "", sexo: u.sexo === "F" ? "F" : "M" };
  return { nome: padrao?.nome || "", sexo: padrao?.sexo === "F" ? "F" : "M" };
}
export const textoSaudacao = u => `${u.sexo === "F" ? "Bem-vinda" : "Bem-vindo"}, ${String(u.nome || "").trim().split(/\s+/)[0] || "visitante"}`;
