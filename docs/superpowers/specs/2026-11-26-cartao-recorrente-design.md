# Cartão de crédito recorrente — desenho

**Situação (26/11/2026):** a parte da tela está pronta. O back (cobrança automática) fica para depois, com a implantação prevista em cerca de duas semanas.

## Por quê

A recepção deve conseguir fazer igual às academias que usam Tecnofit com a maquininha Ton: o aluno entrega o cartão, a recepção digita no sistema na frente dele e a mensalidade passa a ser cobrada todo mês, sem ninguém precisar lembrar.

## O que já existe (front, sem back)

- **Planos › Cobrança:** cada plano é "Pix, dinheiro ou cartão na hora" (`manual`, o padrão) ou "Cartão de crédito recorrente" (`cartao`).
  - Fica gravado em `plano.cobranca`.
  - Planos antigos sem o campo contam como `manual`.
- O cartão do plano mostra a etiqueta "Cartão recorrente · em breve automático".
- A ficha do aluno mostra "cartão recorrente" junto do plano.
- Na baixa do Financeiro, a forma "Cartão recorrente" já vem marcada para os alunos desses planos. Até a integração, a baixa é manual, conferindo o extrato da Stone.
- A lógica fica em `js/logica/cobranca.js` (`cobrancaDoPlano`, `noCartaoRecorrente`, `formaPadrao`), com os testes em `tests/cobranca.test.mjs`.

## Back (a fazer)

- **Gateway:** Pagar.me, do grupo Stone, o mesmo do Ton. Usa assinatura e cartão guardado no cliente.
- **Regra de ouro:** o GB Admin nunca vê nem guarda o número do cartão.
  - A recepção digita nos campos seguros da Pagar.me (tokenização no navegador).
  - Só são guardados o id do cliente e da assinatura na Pagar.me, a bandeira e os 4 últimos dígitos.
- **Servidor:** Cloud Functions do Firebase, o que exige o plano Blaze (precisa de aprovação do Leandro).
  - `criarAssinatura(alunoId, token)`: cria o cliente, o cartão e a assinatura com o valor do aluno (respeita o valor combinado).
  - `cancelarAssinatura(alunoId)`.
  - Webhook da Pagar.me: um pagamento aprovado marca a mensalidade como paga (`forma: "Cartão recorrente"`). Uma falha deixa a mensalidade em atraso e avisa no painel.
- **Chave secreta:** o Leandro guarda direto no Firebase (secret). Ela nunca vai para o repositório nem para o navegador.
- **Ficha do aluno:** botões "Cadastrar cartão" e "Cancelar recorrência", com o status da assinatura.
- **SaaS:** cada academia liga a própria conta Pagar.me, e o dinheiro cai na conta dela.
- **Ordem:** primeiro tudo no modo de teste da Pagar.me, com cartões de teste, e só depois em produção.

## Pendências do lado do Leandro, antes do back

- Criar a conta Pagar.me da academia e gerar as chaves de teste.
- Aprovar o plano Blaze do Firebase.
