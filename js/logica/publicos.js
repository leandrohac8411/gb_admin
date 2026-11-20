// Públicos da tela Comunicação: quem recebe cada mensagem.
import { diasEntre } from "./datas.js";
import { inadimplentes } from "./financeiro.js";
import { aptidao } from "./graduacao.js";
import { varsParaContato } from "./modelos.js";
import { dataLonga } from "../ui/util.js";

export const PUBLICOS = [
  ["ativos", "Todos os alunos ativos"], ["aniversariantes", "Aniversariantes do mês"], ["atrasados", "Mensalidade atrasada"],
  ["sumidos", "Sem treinar há 14 dias ou mais"], ["novos", "Matriculados nos últimos 30 dias"], ["aptos", "Aptos a graduar"],
  ["responsaveis", "Responsáveis das crianças"], ["prospects", "Prospects em aberto"]
];

function ultimo(alunoId, checkins) {
  let u = null;
  for (const c of checkins) if (c.alunoId === alunoId && (!u || c.data > u)) u = c.data;
  return u;
}

export function publico(chave, d, hojeISO) {
  const ativos = d.alunos.filter(a => a.status === "ativo");
  const doAluno = a => {
    const vars = varsParaContato(a, d, hojeISO);
    return { id: a.id, nome: a.categoria === "kids" && a.responsavel ? `${a.responsavel.nome} (${a.responsavel.parentesco} de ${a.nome.split(" ")[0]})` : a.nome, telefone: vars.telefone, vars };
  };
  let lista;
  if (chave === "ativos") lista = ativos;
  else if (chave === "responsaveis") lista = ativos.filter(a => a.categoria === "kids");
  else if (chave === "aniversariantes") lista = ativos.filter(a => a.nascimento && a.nascimento.slice(5, 7) === hojeISO.slice(5, 7));
  else if (chave === "atrasados") { const ids = new Set(inadimplentes(d.mensalidades, d.alunos, hojeISO)); lista = ativos.filter(a => ids.has(a.id)); }
  else if (chave === "sumidos") lista = ativos.filter(a => { const u = ultimo(a.id, d.checkins); return u ? diasEntre(u, hojeISO) >= 14 : diasEntre(a.desde, hojeISO) >= 14; });
  else if (chave === "novos") lista = ativos.filter(a => diasEntre(a.desde, hojeISO) <= 30);
  else if (chave === "aptos") lista = ativos.filter(a => aptidao(a, d.checkins, hojeISO).tipo);
  else if (chave === "prospects") {
    const academia = d.config?.academia?.nome || "academia";
    return (d.prospects || []).filter(p => ["novo", "contato", "experimental"].includes(p.etapa))
      .map(p => ({ id: p.id, nome: p.nome, telefone: p.telefone, vars: { nome: p.nome, primeiro: p.nome.split(" ")[0], academia, data: dataLonga(hojeISO), telefone: p.telefone, faixa: "", plano: "", valor: "", desde: "", aulas30: "", crianca: "" } }));
  } else return [];
  return lista.map(doAluno);
}
