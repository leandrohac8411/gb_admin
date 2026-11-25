// Regras de formulário usadas em várias telas (achadas no teste manual de 25/11/2026).

// Valor em reais digitado: de R$ 0,01 até "max", com no máximo 2 casas (centavos). null = inválido.
export function valorReais(texto, max) {
  const t = String(texto ?? "").trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  const v = Number(t);
  return v >= 0.01 && v <= max ? v : null;
}

// Telefone é opcional; quando vem, precisa ter de 8 a 13 dígitos (fixo, celular ou com +55).
export function telefoneValido(texto) {
  const t = String(texto ?? "").trim();
  if (!t) return true;
  const n = t.replace(/\D/g, "").length;
  return n >= 8 && n <= 13 && !/[a-z]/i.test(t);
}

// Prospect vira aluno na categoria da turma onde fez a aula experimental.
export function categoriaDoProspect(p, turmas) {
  const t = (turmas || []).find(x => x.id === p?.experimental?.turmaId);
  return t?.categoria === "kids" ? "kids" : "adulto";
}

// Evento que muda de público: quem continua inscrito e quem sai (ids de alunos que não existem mais somem).
export function inscritosDoPublico(inscritos, publico, alunosPorId) {
  const ficam = [], saem = [];
  for (const id of inscritos || []) {
    const a = alunosPorId[id];
    if (!a) continue;
    (publico === "todos" || (a.categoria || "adulto") === publico ? ficam : saem).push(id);
  }
  return { ficam, saem };
}
