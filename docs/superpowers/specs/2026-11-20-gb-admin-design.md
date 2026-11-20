# GB Admin — painel da academia (vitrine de teste)

## Intenção
Leandro quer ver como seria o painel de administração de uma academia de jiu-jítsu completa
("imagina que tenho uma escola de jiu"), pegando a ideia do mockup React
`Downloads/GB_Sobradinho_Manager_React` e trazendo para os padrões visuais e técnicos do
Diário de Tatame. **É só teste**: uma vitrine com dados fictícios.

## Objetivos
- Painel navegável que pareça "da família" do Diário de Tatame: mesmas cores (base branca,
  vermelho GB nos detalhes, azul da faixa), fontes Sora/Manrope, botões, cartões e ícones.
- Reaproveitar as peças do app: faixa desenhada com graus (`faixaSVG`), anéis e radar
  (`graficos.js`), utilitários (`esc`, `toast`, `abrirFolha`).
- Funcionar bem no computador (barra lateral) e no celular (menu recolhido).

## Não-objetivos
- Nada de Firebase, login real, pagamentos ou dados de verdade.
- Não mexer no repositório nem no deploy do Diário de Tatame.
- Não fazer as 25 telas do mockup agora.

## Anti-objetivos (seria fracasso mesmo funcionando)
- Ficar com cara do mockup React genérico em vez da cara do Diário.
- Quebrar ou poluir o app que Leandro e Stephany usam.
- Publicar marca/dados da GB em lugar público.

## Restrições
- HTML/CSS/JS puro com módulos ES, sem build, igual ao Diário.
- Pasta própria: `C:\xampp\htdocs\gb-admin`, com git local próprio (sem remoto por enquanto).
- Dados fictícios gerados num arquivo `js/dados-ficticios.js`; alterações feitas na tela
  (cadastrar aluno, registrar check-in, lançar pagamento) ficam no `localStorage`, com botão
  "Restaurar dados de exemplo".

## Abordagens consideradas
- **A) Projeto separado no estilo do app (escolhida)** — pasta nova em JS puro copiando
  cores, fontes e componentes do Diário. App real intocado; dá para ligar no Firebase depois.
- B) Rota `#admin` dentro do Diário — reaproveita código direto, mas mistura teste com o app
  real e subiria para a Vercel.
- C) Repintar o React do mockup — rápido, mas fica fora do padrão (React + build) e não
  reaproveita as peças do app.

## Telas da primeira leva (decisão: começar pelo coração da academia)
1. **Dashboard** — números do mês (alunos ativos, check-ins, receita, inadimplência),
   gráfico de presença por semana, aulas de hoje, aniversariantes/alertas.
2. **Alunos** — lista com busca e filtros (ativo, inadimplente, trancado), faixa desenhada com
   graus em cada linha; **ficha do aluno** com foto/iniciais, categoria IBJJF, frequência,
   progresso até a próxima faixa e histórico.
3. **Agenda & turmas** — grade da semana (mesmo formato de turmas do Diário: dia, horário,
   professor, GB1/GB2/GB1+GB2), semana do ciclo atual.
4. **Check-ins** — presenças do dia por turma, registrar presença manual.
5. **Graduações** — alunos aptos a grau/faixa (por número de aulas e tempo), avaliar e
   promover; faixa desenhada mudando.
6. **Financeiro** — mensalidades do mês (pago, pendente, atrasado), lançar pagamento,
   total recebido vs. previsto.

Demais telas do mockup (professores, planos, estoque, contratos, prospects, comunicação,
relatórios, permissões, portal, configurações) aparecem no menu como "em breve".

## Decisões do builder (calls do Claude, corrigíveis)
- Layout: barra lateral fixa ≥ 900px; abaixo disso, cabeçalho com botão de menu.
- Roteamento por hash (`#alunos`, `#aluno/ID`), igual ao Diário.
- Uns 40 alunos fictícios em várias faixas, 15 turmas iguais à grade real da GB Sobradinho,
  professores fictícios.
- Sem testes automatizados além da lógica pura (cálculo de aptidão a grau e resumo financeiro),
  com `node --test`.
- Serve local em `http://127.0.0.1:8767`.
