# GB Admin — Kids (desenho curto)

## Intenção
Leandro quer que o painel tenha alunos **Adultos** e **Kids**, "tudo igual": saber quando graduar e trocar de
faixa também para as crianças. Continua sendo vitrine: só front, dados fictícios, sem banco.

## Decisões (aprovadas)
- Aluno tem `categoria: "adulto" | "kids"`. Um cadastro só; **abas Adultos | Kids** em Alunos, Graduações,
  Check-ins, Acompanhamentos e Relatórios. A aba fica lembrada entre telas; "Novo aluno" usa a aba aberta.
- Cadastro kids: responsável (nome, parentesco, telefone, quem pode buscar), alergias/observações, autorização de imagem.
  Mensalidade e mensagens vão para o responsável.
- Faixas kids (desenhadas, até 4 graus): branca → cinza/branca, cinza, cinza/preta → amarela/branca, amarela,
  amarela/preta → laranja/branca, laranja, laranja/preta → verde/branca, verde, verde/preta.
- Regras kids (Configurações, editáveis): grau = 20 aulas + 2 meses; troca de faixa = 4 graus + 6 meses na faixa +
  idade mínima da cor (cinza 4, amarela 7, laranja 10, verde 13). Aos 16 anos: aviso "passa para Adultos".
- Agenda: turmas kids fictícias à tarde, etiqueta **Kids**, por idade (4–6, 7–10, 11–15).
- Dashboard: kids ativos e kids aptos. Comunicação: público "Responsáveis das crianças".
- ~18 crianças fictícias. **Produtos & estoque sai do menu** (academia não vende roupa).

## Abordagens
- **Um cadastro com categoria + abas (escolhida)** — "tudo igual" de verdade: mesma ficha, mesma tela de graduação.
- Módulo Kids separado — duplicaria telas e regras; descartado.

## Não-objetivos
Banco, login, portal do responsável, vendas.
