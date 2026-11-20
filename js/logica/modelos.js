// Modelos de documento/mensagem: troca {{campo}} pelos dados. Campo desconhecido fica visível.
import { dataLonga } from "../ui/util.js";
import { reais } from "../ui/util-admin.js";
import { nomeFaixa } from "../ui/faixa.js";
import { aulasNosUltimos } from "./relatorios.js";

export const CAMPOS = ["nome", "primeiro", "faixa", "plano", "valor", "desde", "data", "academia", "aulas30", "telefone"];

export function preencher(texto, vars) {
  return String(texto ?? "").replace(/\{\{\s*(\w+)\s*\}\}/g, (todo, k) => (vars[k] ?? todo));
}

export function varsDoAluno(a, d, hojeISO) {
  const plano = d.planos?.find(p => p.id === a.plano);
  return {
    nome: a.nome, primeiro: a.nome.split(" ")[0], faixa: nomeFaixa(a.faixa).toLowerCase(), plano: plano?.nome || a.plano,
    valor: reais(a.valor), desde: dataLonga(a.desde), data: dataLonga(hojeISO), academia: d.config?.academia?.nome || "academia",
    aulas30: String(aulasNosUltimos(a.id, d.checkins, hojeISO, 30)), telefone: a.telefone || ""
  };
}
