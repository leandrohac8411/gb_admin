// Cobrança do plano: manual (Pix, dinheiro ou cartão na hora) ou cartão de crédito recorrente.
// O recorrente ainda não cobra sozinho: a integração com o gateway (Pagar.me) vem depois;
// por enquanto a recepção dá baixa no Financeiro conferindo o extrato.
export const COBRANCAS = { manual: "Pix, dinheiro ou cartão na hora", cartao: "Cartão de crédito recorrente" };

export const cobrancaDoPlano = plano => (plano?.cobranca === "cartao" ? "cartao" : "manual");

export const noCartaoRecorrente = (aluno, planos) => cobrancaDoPlano((planos || []).find(p => p.id === aluno?.plano)) === "cartao";

export const formaPadrao = (aluno, planos) => (noCartaoRecorrente(aluno, planos) ? "Cartão recorrente" : "Pix");
