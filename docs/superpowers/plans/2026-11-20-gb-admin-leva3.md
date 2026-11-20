# GB Admin leva 3 — plano

**Spec:** `docs/superpowers/specs/2026-11-20-gb-admin-leva3-design.md` · executar inline, TDD na lógica, navegador nas telas.

## Interfaces
- `js/logica/caixa.js`: `CATEGORIAS_DESPESA`; `fluxoDoMes(d, comp) -> { entradas, saidas, saidasPagas, saldo, porCategoria: [{categoria, valor}] }`
  (entradas = soma de mensalidades com `pagoEm` no mês; saídas = despesas com `data` no mês).
- `js/logica/familia.js`: `irmaos(aluno, alunos) -> aluno[]` (kids ativos com o mesmo telefone do responsável, sem o próprio);
  `valorComDesconto(valor, ordem, pct) -> number` (ordem 0 = 1º filho sem desconto);
  `CRITERIOS = ["respeito","disciplina","atencao","coleguismo"]`; `mediaComportamento(avaliacoes, alunoId, comp?) -> number|null`
  (comp omitido = avaliação mais recente).
- `js/store.js`: `validarDados(d) -> boolean` (mesma regra do `ler`).
- Dados: `despesas` (6 recorrentes × 3 meses + avulsas), `eventos` (4), `avaliacoes` (kids ativos × 3 meses), 2 pares de irmãos,
  `trancamento` nos trancados, `experimental` em 2 prospects, `config.descontoIrmaos = 10`, `VERSAO = 5`.

## Tarefas
1. Testes + lógica (caixa, familia, validarDados) + dados — commit.
2. Financeiro: chips "Mensalidades | Fluxo de caixa", abas Adultos|Kids nas mensalidades, despesas — commit.
3. Eventos (menu + tela) — commit.
4. Kids: comportamento (ficha + graduações), irmãos (ficha + cadastro com desconto), portal do responsável — commit.
5. Aula experimental (prospects → agenda/check-ins), motivo de trancamento (ficha + relatórios), backup (config) — commit.
6. Navegador (desktop + celular) e revisão independente; corrigir importantes — commit.
