# Portal do aluno (`/aluno`) — desenho

Data: 25/11/2026 · Status: aguardando aprovação do Leandro

## 1. Por que

A aula vira um registro compartilhado entre a academia e o aluno:

- o professor registra a presença e tira a foto no GB Admin;
- **quem fez check-in** na aula vê a foto e o tema, e escreve o próprio diário (o que aprendeu, dificuldades, o que revisar);
- **quem não foi** vê qual foi a aula (tema, técnicas, roteiro) e a foto do dia.

O `/aluno` reaproveita as telas e a lógica do Diário de Tatame, mas usa o banco do GB Admin (`gbadmin-48ff9`). Ele "nasce junto com o GB Admin": o Diário antigo (`jiujitsu-60836`) **não é tocado nem importado**, e o diário de cada um começa do zero.

## 2. Objetivos

- `admin-gbsob.vercel.app/aluno` abre o login do aluno.
- Só entra quem o painel liberou (opção A): na ficha do aluno, "Liberar acesso ao portal" com o e-mail dele.
- O aluno vê a faixa, os graus, a frequência e o próximo passo da graduação, tudo vindo do GB Admin (não digita isso).
- O aluno vê as aulas da academia (tema, técnicas, roteiro e foto) e escreve o diário nas aulas em que esteve.
- O check-in pelo celular (GPS da academia, só no dia) vira presença na lista do professor.

## 3. Não objetivos (por enquanto)

- **Kids:** fica para depois. O acesso pelos pais vem numa próxima etapa, e só aluno adulto pode ser liberado.
- Peso, evolução e gráficos do Diário (segunda etapa).
- Mensalidades, contratos e pagamento no portal.
- Importar os dados do Diário antigo.

## 4. Anti-objetivos (seria fracasso mesmo funcionando)

- Um aluno conseguir ler dados de outro aluno (nome, presença, diário, mensalidade).
- Uma pessoa de fora conseguir ler qualquer coisa só porque criou uma conta.
- Estourar o plano gratuito do Firebase ou precisar do Blaze ou do Storage.
- Quebrar ou deixar mais lento o GB Admin que já está em uso.

## 5. Restrições

- **Custo zero:** Firebase no plano gratuito (50 mil leituras e 20 mil gravações por dia, 1 GB). Sem Cloud Functions.
- Mesmo repositório e mesmo deploy da Vercel do GB Admin. JS puro com módulos ES, sem build. SDK Firebase 10.12.2 da gstatic.
- A CSP atual (`script-src 'self'`) vale também para o `/aluno`. O `/aluno` precisa de `geolocation=(self)` no `Permissions-Policy`, e o painel continua com `geolocation=()`.
- O push e o `firebase deploy` são feitos pelo Leandro.

## 6. Caminhos considerados

| | Caminho | Prós | Contras |
|---|---|---|---|
| **A (escolhido)** | **Espelho para o portal.** O GB Admin continua dono dos dados (os "baldes" de `painel`) e, ao salvar, grava coleções pequenas só com o que o aluno pode ver. | Não mexe no que funciona; poucas leituras; regras simples por aluno. | A visão do aluno se atualiza quando alguém abre ou salva o painel (na prática, todo dia). |
| B | Reorganizar o banco: um documento por aluno e por presença. | Mais "limpo". | Milhares de leituras por abertura do painel (risco de estourar a cota) e migração arriscada dos dados de produção. |

O Leandro escolheu o **A** depois de ver o risco da cota no B.

## 7. Dados (Firestore `gbadmin-48ff9`)

Coleções novas. Os baldes de `painel` não mudam.

| Coleção | Quem grava | Quem lê | Conteúdo |
|---|---|---|---|
| `acessos/{email}` | painel | o próprio aluno (e-mail verificado igual ao id) | `alunoId`, `nome`, `liberadoEm`. O id é o e-mail em minúsculas. |
| `portal/{alunoId}` | painel (espelho) | o aluno dono | `nome`, `faixa`, `graus`, `desdeFaixa`, `ultimaGraduacao`, `presencas: [{ data, turmaId, hora }]`, `proximoPasso` (texto e números do `aptidao` do GB Admin), `atualizadoEm`. |
| `portalGrade/atual` | painel (espelho) | qualquer aluno liberado | Só as turmas **adultas**: `turmas: { id: { diaSemana, horario, programa, professor (nome), modeloAulaId } }`, mais `cronograma`, `ancoras`, `modelosAula` (roteiros). Sem dado pessoal. |
| `fotos/{turma_data}` | painel (já existe) | aluno liberado, só se a turma está em `portalGrade/atual.turmas` | Foto da aula (já feita). |
| `diarios/{alunoId}/aulas/{turma_data}` | o aluno dono | o aluno dono | `aprendi`, `revisar`, `dificuldade` (1 a 5), `tecnicas: [{ nome, resultado }]`, `atualizadoEm`. |
| `checkinsAluno/{alunoId_turma_data}` | o aluno dono | o aluno dono e o painel | `alunoId`, `turmaId`, `data`, `hora`, `distancia`, `criadoEm`. O painel junta na lista de presença e apaga. |

### Regras (resumo)

- `permitido()` (os 3 e-mails do painel) continua igual e dá acesso total, como hoje.
- `aluno()`: `request.auth.token.email_verified == true` e existe `acessos/{e-mail do token}`. Assim, quem cria conta sem ter sido liberado não lê nada.
- `meuAlunoId()` = `get(acessos/{email}).data.alunoId`.
- `portal/{id}`: leitura se `id == meuAlunoId()`.
- `diarios/{id}/...` e `checkinsAluno`: o aluno só lê e grava o que tem o próprio `alunoId`, com formato e tamanhos conferidos.
- `fotos` e `portalGrade`: leitura para `aluno()`; `fotos` só de turma adulta (presente no mapa de turmas do `portalGrade`).

## 8. Fluxos

### Liberar o acesso (painel)
Na ficha do aluno adulto aparece o cartão **Portal do aluno**, com o e-mail e os botões **Liberar acesso** e **Tirar acesso**. Liberar grava `acessos/{email}` e o `portal/{alunoId}`. Tirar apaga o `acessos`, e o aluno perde a leitura na hora.

### Primeiro acesso (aluno)
Em `/aluno`, o aluno toca em **Primeiro acesso** e informa o e-mail e uma senha. O app cria a conta e manda o e-mail de verificação. Depois de confirmar, ele entra. Se o e-mail não estiver liberado, aparece "Esse e-mail ainda não foi liberado pela academia". Também tem **Esqueci a senha**.

**Consequência:** o cadastro do Firebase Auth precisa **continuar aberto**, e isso desfaz a recomendação da auditoria de desligá-lo. Quem não é liberado não lê nada, por causa das regras e da exigência de e-mail verificado.

### Espelho (painel)
Depois de cada `store.salvar()` e ao abrir o painel, o painel calcula os documentos do portal (`portal/*` só de quem tem acesso, e `portalGrade/atual`), compara com o que já gravou e grava só o que mudou. É lógica pura e testável em `js/logica/portal.js`.

### Check-in do aluno
O check-in só vale no dia, a até 50 m da academia e na turma do horário, como no Diário. Ele grava `checkinsAluno` e aparece na hora para o aluno. Ao abrir o painel, os check-ins pendentes dos últimos 7 dias viram presença (`origem: "aluno"`), sem duplicar, e o documento de origem é apagado.

### Diário da aula
O aluno abre uma aula. Se ele esteve nela (pelo `portal.presencas` ou por um check-in pendente), aparece **Meu diário** para editar. Se não esteve, vê só o tema, as técnicas, o roteiro e a foto.

## 9. Telas do `/aluno` (v1)

1. **Entrar:** login, Primeiro acesso, Esqueci a senha.
2. **Início:** faixa com graus, frequência do mês, próximo passo da graduação e a aula de hoje com o botão de check-in.
3. **Aulas:** lista por dia; cada aula com tema, técnicas, roteiro, foto e a marca "você esteve".
4. **Aula:** os detalhes da aula mais **Meu diário** (se esteve).
5. **Perfil:** nome, e-mail e Sair.

Visual: o do Diário (mobile primeiro), com as telas e a lógica copiadas e adaptadas para a camada de dados nova. Arquivos em `aluno/index.html`, `js/aluno/` e `css/aluno.css`.

## 10. O que fica a cargo de quem constrói

- Os nomes internos das funções e a divisão dos arquivos em `js/aluno/`.
- Como mostrar "carregando" e "sem internet".
- Quanto do CSS do Diário dá para reaproveitar.

## 11. Decisões minhas (o Leandro pode trocar)

- O aluno não tem o limite de 15 minutos de inatividade do painel, porque é o celular dele e o portal não tem dinheiro nem dados de outros.
- O e-mail precisa estar verificado para o aluno entrar.
- Ao tirar o acesso, o diário do aluno continua guardado (volta se for liberado de novo).
- Um aluno trancado perde a leitura do portal até ser reativado. O espelho grava `ativo: false` em `acessos/{email}`, e a regra `aluno()` exige `ativo == true`. O e-mail fica guardado para reativar.
- Cada item de `presencas` guarda também `horario` e `programa`, para a aula continuar legível se a turma mudar ou sair da grade.
- O aluno **não** envia foto própria na v1. A foto é a da academia (coleção `fotos`).
- Se duas turmas adultas têm o mesmo horário no dia, o check-in pergunta qual é a aula. Senão, escolhe sozinho a turma que está acontecendo (de 30 minutos antes do início até o fim).
- O "só no dia e na academia" do check-in é conferido no app, como no Diário. A regra confere o dono, o formato e que `data` é uma data válida.
- O professor marcado como "Também treina" é um aluno adulto como os outros e pode ter o acesso liberado.
