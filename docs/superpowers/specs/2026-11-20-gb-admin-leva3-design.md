# GB Admin — terceira leva (9 itens)

Aprovado por Leandro ("vamos fazer os 9"). Continua só front, dados fictícios, sem banco e sem vendas.
Dados sobem para `VERSAO = 5`; novas coleções: `despesas`, `eventos`, `avaliacoes`.

1. **Despesas e fluxo de caixa** — Financeiro ganha a visão "Fluxo de caixa": entradas (mensalidades pagas no mês,
   por `pagoEm`) × saídas (despesas do mês), saldo, gastos por categoria e barras dos últimos 3 meses. Lançar,
   marcar como paga e excluir despesa. Categorias: Aluguel, Professores, Contas, Manutenção, Marketing, Outros.
2. **Abas Adultos | Kids no Financeiro** — a visão "Mensalidades" filtra pela aba; o fluxo de caixa é da academia toda.
3. **Eventos** — item novo no menu (Gestão acadêmica). Tipos: Graduação, Seminário, Campeonato, Confraternização;
   público Adultos/Kids/Todos; data, hora, local, vagas. Próximos e passados; folha com inscritos (inscrever/remover);
   em evento de graduação, botão "Inscrever aptos".
4. **Comportamento kids** — avaliação mensal com estrelas (1–5): respeito, disciplina, atenção, coleguismo + observação.
   Card na ficha kids com a média e histórico; botão "Avaliar mês". Graduações kids mostram a média e avisam
   "comportamento abaixo de 3" (informativo; não bloqueia a regra).
5. **Irmãos e desconto** — irmãos = crianças com o mesmo telefone do responsável. Desconto configurável
   (`config.descontoIrmaos`, padrão 10%) a partir do 2º filho; aplicado no cadastro de nova criança; ficha mostra irmãos.
6. **Portal do responsável** — no Portal do aluno, ao escolher uma criança, a tela vira a visão do responsável:
   "Olá, Ana" com um cartão por filho (faixa, treinos, próxima aula, estrelas) e o total das mensalidades.
7. **Aula experimental na Agenda** — ao mover prospect para "Aula experimental", escolhe data e turma.
   A agenda mostra "1 experimental" na turma do dia e o Check-ins lista o visitante.
8. **Motivo ao trancar** — trancar pede motivo (Mudança, Financeiro, Lesão, Horário, Falta de tempo, Insatisfação, Outro)
   e observação. Relatórios ganham "Por que saem".
9. **Backup** — Configurações: exportar todos os dados em JSON e importar um arquivo (validado; inválido é recusado).

Calls do Claude: categorias e valores fictícios das despesas, os 4 critérios de comportamento, desconto padrão 10%,
motivos de saída, eventos de exemplo.
