// Família (kids): irmãos pelo telefone do responsável, desconto e avaliação de comportamento.
const soDigitos = s => String(s || "").replace(/\D/g, "");

export function irmaos(aluno, alunos) {
  if (aluno?.categoria !== "kids") return [];
  const tel = soDigitos(aluno.responsavel?.telefone);
  if (!tel) return [];
  return alunos.filter(a => a.id !== aluno.id && a.categoria === "kids" && a.status === "ativo" && soDigitos(a.responsavel?.telefone) === tel);
}

// ordem 0 = primeiro filho (sem desconto); do segundo em diante, pct% de desconto.
export const valorComDesconto = (valor, ordem, pct) => (ordem > 0 ? Math.round(valor * (100 - (Number(pct) || 0))) / 100 : valor);

export const CRITERIOS = ["respeito", "disciplina", "atencao", "coleguismo"];
export const NOMES_CRITERIOS = { respeito: "Respeito", disciplina: "Disciplina", atencao: "Atenção", coleguismo: "Coleguismo" };

export function mediaComportamento(avaliacoes, alunoId, comp) {
  const doAluno = (avaliacoes || []).filter(v => v.alunoId === alunoId && (!comp || v.mes === comp)).sort((a, b) => b.mes.localeCompare(a.mes));
  const v = doAluno[0];
  if (!v) return null;
  const notas = CRITERIOS.map(c => Number(v.notas?.[c])).filter(Number.isFinite);
  return notas.length ? Math.round(notas.reduce((s, n) => s + n, 0) / notas.length * 10) / 10 : null;
}
