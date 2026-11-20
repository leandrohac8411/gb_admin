// Fluxo de caixa: entradas (mensalidades pagas no mês) × saídas (despesas do mês).
export const CATEGORIAS_DESPESA = ["Aluguel", "Professores", "Contas", "Manutenção", "Marketing", "Outros"];

export function fluxoDoMes(d, comp) {
  const entradas = (d.mensalidades || []).filter(m => m.pagoEm && m.pagoEm.startsWith(comp)).reduce((s, m) => s + (Number(m.valor) || 0), 0);
  const doMes = (d.despesas || []).filter(x => x.data.startsWith(comp));
  const saidas = doMes.reduce((s, x) => s + (Number(x.valor) || 0), 0);
  const saidasPagas = doMes.filter(x => x.pago).reduce((s, x) => s + (Number(x.valor) || 0), 0);
  const cat = new Map();
  for (const x of doMes) cat.set(x.categoria, (cat.get(x.categoria) || 0) + (Number(x.valor) || 0));
  const porCategoria = [...cat].map(([categoria, valor]) => ({ categoria, valor })).sort((a, b) => b.valor - a.valor);
  return { entradas, saidas, saidasPagas, saldo: entradas - saidas, porCategoria };
}
