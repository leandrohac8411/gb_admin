# Tudo no banco (etapa 2)

## Por quê
O Leandro quer salvar e ver depois, de qualquer aparelho, tudo o que for digitado ou editado no painel: cada campo e cada edição. Os dados fictícios continuam por enquanto, mas também passam a ficar no banco.

## Objetivos
- Toda tela que hoje chama `store.salvar()` grava no Firestore, sem reescrever tela por tela.
- Duas pessoas editando itens diferentes ao mesmo tempo não apagam o trabalho uma da outra.
- Custo zero: o plano gratuito do Firestore tem 50 mil leituras por dia, e abrir o painel gasta umas 35 leituras.

## O que fica de fora
- Fotos das aulas continuam não sendo guardadas no modo logado.
- Rosto: segue na coleção `rostos`, com as regras rígidas de hoje.

## O que não pode acontecer
- Dados reais sumirem ao recarregar a página.
- "Restaurar dados de exemplo" apagar os dados reais do banco.
- Abrir o painel sem dados e regravar o fictício por cima do que está no banco.

## Opções consideradas
- **Um documento por item:** cerca de 1.600 leituras a cada abertura, só nos check-ins. Estoura o limite gratuito. Descartada.
- **Tudo num documento só:** duas edições ao mesmo tempo apagam uma à outra. Descartada.
- **Baldes por tipo, com um mapa de itens (escolhida):** coleção `painel` com um documento por tipo de dado (`alunos`, `mensalidades`…). Os check-ins ficam em um balde por mês (`checkins-AAAA-MM`). Cada documento tem `itens: { id: item }` e a configuração fica em `config.valor`. Cada gravação atualiza só os itens alterados, pelo caminho `itens.<id>`, e o item apagado é removido com `deleteField`.

## Como funciona
- **Ao salvar:** o sistema compara os dados com a última versão vinda do banco e grava só a diferença. Item sem `id`, como as graduações, ganha um id. A ordem é guardada no campo `_o`.
- **Ao abrir:** o painel ouve a coleção `painel` e a coleção `rostos`, e só é desenhado depois da primeira leitura. Enquanto houver uma janela de edição aberta, os dados não são trocados.
- **Primeiro acesso:** se o documento `painel/meta` não existe, uma única gravação copia os fictícios (marcados com `exemplo: true`) junto com os alunos, turmas e check-ins reais das coleções antigas. Os ids dos alunos reais são mantidos, para os rostos continuarem valendo.
- **Fora do banco:** `config.usuario` (o nome muda conforme quem entra) e `fotosAula`.
- **Sem dados no navegador:** no modo logado nada vai para o `localStorage`. Quem guarda a cópia offline é o cache do Firestore.
- **Configurações:** "Restaurar" e "Importar backup" somem no modo logado. Entra **Apagar dados de exemplo**, que tira os alunos de exemplo e tudo ligado a eles, além de prospects, despesas, eventos, comunicações e acompanhamentos de exemplo. Planos, produtos, modelos, habilidades, perfis, usuários, cronograma, professores e turmas ficam.
- **Cadastro:** a caixa "Aluno real" sai e todo aluno novo vai para o banco com `real: true`. A etiqueta "Real" continua.
- **Regras do Firebase:** `painel/{doc}` aceita só os e-mails autorizados, nomes de documento conhecidos e os campos `itens`, `valor` ou os campos do meta. A conferência de cada campo fica no app. O rosto só é aceito se o aluno existir em `painel/alunos`.
- **Grade do Diário:** passa a ser gravada nos dados, com ids `d-<dia>-<hhmm>`, e substitui as turmas adultas de exemplo.

## O que fica para o construtor
Mensagens de erro, a tela de carregamento e o nome das funções.
