// Mensalidades: status e resumo de uma competência (YYYY-MM). Alunos trancados ficam de fora.
export function statusMensalidade(m, hojeISO) {
  if (m.pagoEm) return "pago";
  return m.vencimento < hojeISO ? "atrasado" : "pendente";
}

export function resumoFinanceiro(mensalidades, alunos, competencia, hojeISO) {
  const ativos = new Set(alunos.filter(a => a.status === "ativo").map(a => a.id));
  const r = { previsto: 0, recebido: 0, pendente: 0, atrasado: 0, inadimplentes: [] };
  for (const m of mensalidades) {
    if (m.competencia !== competencia || !ativos.has(m.alunoId)) continue;
    const v = Number(m.valor) || 0, s = statusMensalidade(m, hojeISO);
    r.previsto += v;
    if (s === "pago") r.recebido += v;
    else if (s === "pendente") r.pendente += v;
    else { r.atrasado += v; if (!r.inadimplentes.includes(m.alunoId)) r.inadimplentes.push(m.alunoId); }
  }
  return r;
}

// Alunos ativos com qualquer mensalidade atrasada (de qualquer mês).
export function inadimplentes(mensalidades, alunos, hojeISO) {
  const ativos = new Set(alunos.filter(a => a.status === "ativo").map(a => a.id));
  return [...new Set(mensalidades.filter(m => ativos.has(m.alunoId) && statusMensalidade(m, hojeISO) === "atrasado").map(m => m.alunoId))];
}
