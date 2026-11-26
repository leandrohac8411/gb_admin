# GB Admin: documentação do sistema

Painel administrativo da **GB Sobradinho** (Gracie Barra, Sobradinho-DF). Ele reúne alunos, turmas, presenças, graduações, financeiro, eventos e comunicação num só lugar, no computador ou no celular.

Situação em 24/11/2026: versão visual **v02 "Dashboard claro"**, etapa 2 "tudo no banco". Os dados ficam no Firebase (Firestore) e aparecem iguais em qualquer aparelho.

Outros documentos:

- [PUBLICAR.md](PUBLICAR.md): como colocar no ar (GitHub, Firebase, Vercel) e a lista de testes com login.
- [superpowers/specs/](superpowers/specs/): o desenho de cada etapa, na ordem em que foram feitas.

---

## Sumário

1. [Quem usa e como se entra](#1-quem-usa-e-como-se-entra)
2. [As telas](#2-as-telas)
3. [Regras da academia que o sistema aplica](#3-regras-da-academia-que-o-sistema-aplica)
4. [Presença pela foto e reconhecimento de rosto](#4-presença-pela-foto-e-reconhecimento-de-rosto)
5. [Onde os dados ficam](#5-onde-os-dados-ficam)
6. [Segurança e privacidade](#6-segurança-e-privacidade)
7. [Como o código é organizado](#7-como-o-código-é-organizado)
8. [Rodar no computador e testar](#8-rodar-no-computador-e-testar)
9. [O que ainda é simulado ou manual](#9-o-que-ainda-é-simulado-ou-manual)
10. [Onde mexer para mudar uma regra](#10-onde-mexer-para-mudar-uma-regra)
11. [Portal do aluno (/aluno)](#11-portal-do-aluno-aluno)

---

## 1. Quem usa e como se entra

### Quem entra

No painel só entra o admin cadastrado (hoje, só `leandrohenriqueac@gmail.com`). Ele é reconhecido pelo **UID** da conta (Firebase › Authentication › Users), e não só pelo e-mail: o cadastro fica aberto para o portal do aluno, e com ele aberto qualquer um poderia criar uma conta com um e-mail de admin que ainda não existisse. A lista fica em **dois lugares**, que precisam ser iguais:

- `js/nuvem/config.js` (`USERS`): e-mail, `uid`, nome e saudação ("Bem-vindo" ou "Bem-vinda"); o app abre o painel só se o e-mail **e** o UID baterem;
- `firestore.rules` (`permitido()`): a lista de UIDs, que é o que de fato libera o banco.

Para incluir outro admin (a Stephany, por exemplo): crie a conta em Authentication › Users (*Add user*), copie o UID e acrescente nos dois lugares; depois `firebase deploy --only firestore:rules`.

Uma conta que existe no Firebase mas não está nessa lista é desconectada, e o login mostra "O e-mail … não tem acesso ao painel".

### Os três modos de abertura

O sistema decide sozinho o que abrir (`modoInicial` em `js/logica/validar-nuvem.js`):

| Modo | Quando | O que acontece |
|---|---|---|
| **Login** | Site publicado sem ninguém logado, ou e-mail sem acesso | Mostra a tela de login. Nunca abre o painel sem login. |
| **Painel** | Logado com um e-mail autorizado | Todos os dados vêm do banco e voltam para ele. |
| **Demonstração** | Só no computador (`localhost`) e com o Firebase sem configuração | Academia fictícia guardada só no navegador, com uma faixa no topo avisando. |

### Tela de login

- E-mail, senha e "Esqueci minha senha" (o Firebase manda o e-mail de troca).
- **Bloqueio:** depois de 5 senhas erradas em 10 minutos, espera de 1 minuto; cada erro a mais bloqueia mais 1 minuto. O próprio Firebase também barra excesso de tentativas no servidor.
- **Sair** (no menu) volta para a tela de login. Nada é apagado do banco. Por segurança, ele só limpa a cópia temporária que o navegador guarda para funcionar sem internet; ao entrar de novo, os dados voltam.
- **Sair** e **Apagar dados de exemplo** são botões diferentes: sair nunca apaga dados.
- **Inatividade:** 15 minutos sem clique, tecla ou toque no painel e a sessão cai sozinha (igual ao Sair). A tela de login avisa "Sua sessão foi encerrada depois de 15 minutos sem uso". O último uso fica no navegador, então vale também para aba fechada e reaberta depois, computador que dormiu e várias abas abertas (mexer em qualquer uma renova o prazo).

### Primeiro acesso

No primeiro login com o banco vazio, aparece "Carregando…". O sistema copia para o banco:

- a academia de exemplo (marcada como `exemplo`);
- o que já existia nas coleções antigas da etapa 1 (`alunos`, `turmas`, `checkins`).

Essa cópia é feita de uma vez só: ou entra tudo, ou nada.

### Dados de exemplo

Os dados fictícios servem para ver o painel funcionando antes da academia real estar cadastrada.

- Todo aluno cadastrado no painel logado é **real** e aparece sem etiqueta. Os alunos de exemplo levam uma marca cinza discreta, "EXEMPLO", que some junto com eles.
- O botão **Apagar dados de exemplo** (menu lateral e Configurações) aparece só enquanto houver dados de exemplo. Depois de usado, ele some.
- O que esse botão apaga: alunos de exemplo e tudo ligado a eles (presenças, mensalidades, graduações, contratos...), além de prospects, despesas, eventos, recados, avaliações e comunicações de exemplo.
- O que ele mantém: o "catálogo" que o painel usa para funcionar (planos, produtos, modelos de aula, habilidades, modelos de documento e de mensagem, perfis, usuários, cronograma, professores e turmas).
- Os dados reais nunca são tocados.

---

## 2. As telas

O menu lateral tem 4 grupos. No celular, ele abre pelo botão ☰. A busca do topo procura aluno pelo nome, e o sino mostra as pendências.

Várias telas têm as abas **Adultos | Kids**, e a escolha fica lembrada ao trocar de tela.

### Visão geral

**Dashboard**
- Números do mês.
- Presença das últimas semanas.
- Aulas de hoje.
- **Organize sua rotina**: tarefas com contador "x de y":
  - registrar as presenças das aulas de hoje;
  - conferir as presenças da semana;
  - falar com quem está há 14 dias ou mais sem treinar;
  - avaliar o comportamento dos kids no mês.
- **Timeline** dos últimos 14 dias: check-ins, pagamentos, graduações e matrículas.
- **Atenção**: ações pendentes.
- Mensalidades do mês.
- Aniversariantes do mês.

**Agenda & turmas**
- Grade da semana, de segunda a sábado, com navegação entre semanas.
- Selo da semana do ciclo GB1 e GB2 (por exemplo, "semana 13 de 16").
- Filtro Todas / Adultos / Kids.
- **Nova turma** e **Editar turma**: dia, horário, programa (GB1, GB2, GB1+GB2 ou Kids), modelo de aula e professor.
- Ao tocar numa aula, aparece "Abrir check-ins e foto desta aula". Aula futura não aceita presença.

**Check-ins**
- Escolha do dia (não deixa ir para o futuro) e da aula.
- Registrar presença à mão, ou remover uma presença.
- **Foto da aula**: analisa a foto e sugere quem estava presente (ver [seção 4](#4-presença-pela-foto-e-reconhecimento-de-rosto)).
- Cartão de aula experimental, quando um prospect está agendado para aquela aula.
- "Turmas antigas" mostra presenças de turmas que mudaram de dia ou foram excluídas.

### Gestão acadêmica

**Alunos**
- Abas Adultos | Kids.
- Busca e filtros: Todos, Ativos, Inadimplentes e Trancados.
- Tabela (no celular, cartões).
- **Exportar CSV**: o arquivo abre no Excel. Células que começam com `=`, `+`, `-` ou `@` recebem `'` na frente, para não virarem fórmula.
- **Novo aluno** ou **Nova criança**. Ao cadastrar, o sistema também:
  - cria a primeira mensalidade (mês atual, com o dia de vencimento padrão);
  - cria o contrato (`CTR-ano-número`, pendente);
  - registra a graduação inicial, se a faixa não for branca sem grau;
  - aplica o desconto de irmão: mesmo telefone de responsável dá o percentual de Configurações (padrão 10%) a partir do 2º filho;
  - confere o telefone, que é opcional: se preenchido, precisa ter de 8 a 13 dígitos;
  - no painel logado, aceita uma **Foto do rosto** opcional, que depois pede a autorização.

**Ficha do aluno** (abre ao clicar num aluno)
- Dados pessoais.
- Categoria IBJJF de idade e de peso.
- Responsável.
- Saúde e autorizações.
- **Comportamento** (kids): nota mensal de Respeito, Disciplina, Atenção e Coleguismo.
- Frequência dos últimos 30 dias.
- **Próximo passo** de graduação.
- Mensalidades, graduações e últimos check-ins.
- Botões: **Editar** e **Trancar / Reativar matrícula**. O aluno trancado deixa de contar como ativo e sai das cobranças.
- No aluno real: cartão **Rosto para check-in** (até 3 fotos), **Apagar dados do rosto** e **Excluir aluno**. Excluir apaga também tudo o que aponta para ele, **menos as mensalidades já pagas**: elas ficam no caixa (com o nome do aluno guardado) para o fluxo daquele mês não mudar para trás.

**Graduações**
- Quem está apto (ver as regras na [seção 3](#3-regras-da-academia-que-o-sistema-aplica)).
- Distribuição dos ativos por faixa.
- Sub-abas Aptos, Todos e Histórico.
- **Dar grau** ou **Trocar faixa**.
- Cartão "Passam para Adultos": crianças que completaram 16 anos.

**Eventos**
- Graduações, seminários, campeonatos e confraternizações.
- Cada evento tem público, vagas e lista de inscritos.
- Se o público mudar (por exemplo, de Todos para Kids), quem não é do público novo sai da lista e o aviso diz quantos saíram.
- "Inscrever aptos" preenche as vagas com os aptos.
- Evento passado mostra "Ver participantes".

**Professores**
- Equipe, com faixa, graus, turmas e alunos atendidos.
- **Editar e foto** (painel logado): cadastra o rosto do professor. Na foto da aula, ele aparece como **Professor**. A caixa **Também treina** deixa ele como professor e aluno: cria uma ficha de aluno com o mesmo nome, faixa e graus (plano "Professor", sem mensalidade nem contrato) ou liga a um aluno de mesmo nome que já exista. Ao salvar de novo, a ficha acompanha nome, faixa e graus. Na foto da aula aparece **Treinou**, e marcando, a presença vai para essa ficha (frequência e graduação). Desmarcada, ele fica só como professor: a ficha sem nenhum treino é apagada; com histórico, é trancada (motivo "Professor que não treina") e volta se marcar de novo.
- Só é possível excluir um professor sem turmas.

**Acompanhamentos**
- Quem precisa de atenção, dividido em listas:
  - **Sumidos**: 14 dias ou mais sem treinar;
  - **Frequência baixa**: de 1 a 4 aulas em 30 dias;
  - **Novos**: matriculados há 30 dias ou menos;
  - **Aptos a graduar**.
- Aba **Anotações**: registro de contatos e observações da equipe.

**Cronogramas**
- O que se ensina em cada uma das 16 semanas do ciclo, para GB1 e GB2.
- Aula A (segunda e terça) e Aula B (quarta e quinta). Sexta e sábado revisam as duas.
- **Importar currículo (JSON)**, no formato do Diário de Tatame. As semanas do arquivo substituem as que existem, e as semanas que ainda são iguais ao **cronograma de exemplo** (de qualquer programa) saem: importando só o GB1, o GB2 de exemplo some e fica "tema ainda não cadastrado" até a academia preencher. Semana editada à mão fica. O currículo real do GB1 está em `diario-tatame/tools/carga/curriculo.json` (fora do git).
- **Ajustar semana atual**: diz em que semana o programa está a partir desta segunda.

**Modelos de aula**
- Divisão da aula em blocos (aquecimento, técnica, rola...), com o total de minutos.

**Habilidades**
- O que se espera em cada posição e nível, e a partir de qual faixa.

### Operação

**Financeiro**, com duas visões:
- **Mensalidades**:
  - mês a mês, com os totais previsto, recebido, pendente e atrasado;
  - **Marcar pago**, com a data (até hoje) e a forma de pagamento;
  - **Novo lançamento**: mensalidade avulsa para um aluno ativo.
- **Fluxo de caixa**:
  - entradas (mensalidades pagas) × saídas (despesas) nos últimos 3 meses;
  - "Para onde vai o dinheiro", por categoria;
  - despesas do mês: nova, marcar paga e excluir. As categorias são Aluguel, Professores, Contas, Manutenção, Marketing e Outros.

**Planos**
- Mensal, trimestral, semestral e anual, cada um com valor e situação (ativo ou inativo).
- Ao editar o valor, é possível aplicar o novo valor aos alunos atuais do plano. Quem pagava com desconto de irmão continua com o desconto sobre o valor novo.
- Valores em reais (planos, mensalidades e despesas) aceitam de R$ 0,01 para cima, com no máximo 2 casas de centavos.
- Novos alunos só veem os planos ativos.

**Produtos & estoque**
- Uniformes, faixas e acessórios, com botões − e + para o estoque e aviso de estoque baixo.
- **Hoje essa tela não abre.** O código está em `js/telas/operacao.js`, mas ela não está no menu nem registrada em `registrarTelas()`.

**Contratos**
- Um contrato por matrícula, gerado a partir do modelo de documento.
- **Ver** mostra o texto preenchido, com os botões **Copiar texto** e **Marcar como assinado**.

**Prospects**
- Funil Novo → Contato → Aula experimental → Matriculado, mais a coluna Perdido.
- Ao agendar a aula experimental, escolhem-se a data e a turma.
- **Matricular** abre o cadastro já preenchido. Se a aula experimental foi numa turma Kids, abre como **Nova criança**, com o telefone no campo do responsável.
- Origens: Instagram, Indicação, Google, Site, Passou na porta e Outro.

**Comunicação**
- Escolha do público e do modelo de mensagem.
- Públicos:
  - alunos ativos;
  - aniversariantes do mês;
  - mensalidade atrasada;
  - sem treinar há 14 dias ou mais;
  - novos (30 dias);
  - aptos a graduar;
  - responsáveis das crianças;
  - prospects em aberto.
- **Copiar mensagem** traz o texto já preenchido para cada pessoa. Para criança, a mensagem é endereçada ao responsável.
- O "Enviar" é **simulado**: ele só registra em "Enviadas" (ver a [seção 9](#9-o-que-ainda-é-simulado-ou-manual)).

**Relatórios** (últimos 30 dias)
- Presença por dia da semana e por horário.
- Ranking de quem mais treinou.
- Ativos por faixa.
- Receita por plano.
- Novos alunos em 90 dias.
- **Exportar frequência (CSV)**.

### Administração

**Modelos de documentos** e **Modelos de mensagens**
- Textos com campos `{{nome}}`, `{{primeiro}}`, `{{crianca}}`, `{{faixa}}`, `{{plano}}`, `{{valor}}`, `{{desde}}`, `{{data}}`, `{{academia}}`, `{{aulas30}}` e `{{telefone}}`.
- Um campo desconhecido continua visível no texto, para o erro ser notado.
- "Copiar preenchido" copia o texto já com os dados.

**Permissões**
- Usuários e o que cada perfil vê (Administrador, Professor, Recepção).
- **Ilustrativa**: quem entra de verdade é definido pela lista de admins (seção 1).

**Configurações**
- Quem usa o painel (nome e saudação).
- Dados da academia, dia de vencimento padrão e desconto para irmãos.
- Link do **Portal do aluno** (Diário de Tatame).
- Regras de graduação de adultos e de kids.
- Ciclo do currículo.
- **Importar grade do Diário**: arquivo `grade-diario.json`, gerado no Diário em *Perfil › Exportar grade para o GB Admin*. As turmas adultas passam a ser as reais; as kids continuam as de exemplo.
- **Dados de exemplo**: apagar (painel) ou restaurar (demonstração).
- **Exportar backup (JSON)**. Importar backup só existe na demonstração.

---

## 3. Regras da academia que o sistema aplica

### Graduação (`js/logica/graduacao.js`, ajustável em Configurações)

**Adultos**
- **Grau**: 30 aulas e 3 meses desde a última graduação.
- **Faixa**: 4 graus mais o tempo mínimo na faixa, que é de 12 meses na branca, 24 na azul, 18 na roxa e 12 na marrom.

**Kids**
- **Grau mensal**: 1 mês desde a última graduação e 4 aulas no período.
- **Troca de faixa**: 6 meses na faixa, mais a idade mínima da próxima cor (cinza aos 4 anos, amarela aos 7, laranja aos 10, verde aos 13).
- **Passagem para Adultos aos 16 anos**: a faixa kids vira branca, ou azul se a criança já era verde. É uma regra simplificada.

### Mensalidades (`js/logica/financeiro.js`)

- Uma mensalidade está **paga** quando tem data de pagamento. Sem ela, está **atrasada** se o vencimento já passou, ou **pendente** se ainda não passou.
- **Inadimplente** é o aluno ativo com qualquer mensalidade atrasada, de qualquer mês.
- Alunos trancados ficam fora dos totais.

### Ciclo do currículo (`js/logica/ciclo.js`, `js/logica/tema.js`)

- O ciclo tem 16 semanas, e cada programa (GB1 e GB2) tem a sua "âncora", ajustada em "Ajustar semana atual".
- A aula do dia sai da semana do ciclo: Aula A na segunda e terça, Aula B na quarta e quinta, e as duas na sexta e no sábado.
- Uma turma com aula fixa usa a dela.
- No domingo, o planejamento já olha para a semana seguinte.

### Categorias IBJJF (`js/logica/categorias.js`)

- Categoria de idade (adulto e master) e de peso **com kimono**, por sexo.
- A IBJJF revisa essas tabelas de tempos em tempos. Atualize nesse arquivo, que é o único lugar onde elas estão.

### Família (`js/logica/familia.js`)

- Irmãos são reconhecidos pelo telefone do responsável. Do 2º filho em diante, há o percentual de desconto definido em Configurações.

---

## 4. Presença pela foto e reconhecimento de rosto

### Como funciona

1. Em **Check-ins**, escolha a aula e tire ou envie a foto da turma.
2. O próprio navegador procura os rostos com a biblioteca **face-api** (modelo SSD MobileNet). Os modelos ficam em `vendor/face-api` e são baixados só na primeira análise: uns 5,6 MB para detectar e mais uns 6,5 MB para reconhecer.
3. **Fotos de grupo**: o detector reduz a imagem para 512 px, e numa turma cada rosto fica muito pequeno. Por isso o sistema procura:
   - na foto inteira;
   - e também em **4 pedaços sobrepostos**, cada um com 60% da largura e da altura da foto.

   Depois, junta os achados sem repetir e descarta os rostos cortados na borda de um pedaço. Também descarta quem está "lá no fundo", com rosto menor que 60% da largura mediana (`js/logica/ladrilhos.js`).
4. Para cada rosto, o sistema calcula **128 números** (o "descritor") e compara com os rostos cadastrados (`js/logica/reconhecimento.js`):
   - distância até **0,45**: **Reconhecido**;
   - até **0,55**: **Confira** (dúvida);
   - acima disso: desconhecido.

   Cada pessoa fica com no máximo um rosto da foto, e os pares mais parecidos são decididos primeiro.
5. Cada rosto aparece recortado ao lado do aluno sugerido. Quem não é reconhecido segue pela sugestão por frequência: os alunos que mais treinam naquela turma e naquele dia da semana.
6. O **professor**, se tiver rosto cadastrado, aparece como "Professor". Só ganha presença se estiver marcado como **Também treina** em Professores e você marcar **Treinou** (vem desmarcado); senão aparece "só professor · não treina".
7. Embaixo, um resumo explica a conta: "10 rostos: 8 presentes (1 já estava na lista) · 1 professor sem presença · 1 rosto sem aluno escolhido". Cada rosto cai em uma categoria só. O botão **Registrar 8 presenças** conta todos os presentes da foto, inclusive quem já estava na lista (esses não são gravados de novo).
8. Enquanto analisa, uma faixa verde varre a foto; os rostos achados aparecem um a um.
9. **Sempre é você quem confirma** antes de gravar.

### O sistema aprende com a confirmação

Quando você confirma na foto da aula um rosto que não tinha sido reconhecido de cara, ou corrige a pessoa sugerida, o sistema guarda esse rosto como mais uma referência daquela pessoa. A pessoa precisa já ter autorizado o uso do rosto.

Ficam guardados o rosto da foto de cadastro e os **2 mais recentes** tirados das aulas. Assim, a próxima foto reconhece sozinha.

### Cadastro do rosto

- Na ficha do aluno real, ou em **Professores › Editar e foto**, envie uma foto **só da pessoa, de frente**. Arquivos de até 30 MB são aceitos.
- Se aparecer alguém ao fundo, vale o rosto principal, desde que ele seja pelo menos 4 vezes maior (em área) que o segundo.
- São até **3 fotos** por pessoa, de ângulos diferentes.
- Antes de salvar, abre a **Autorização do uso do rosto**: "Li e autorizo". Quem autoriza é o próprio aluno adulto; para menor de 18 anos, é o responsável.

### O que é guardado (e o que não é)

- Guardados: **só os números** (até 3 descritores), uma **miniatura de 96 px** do rosto (para a tela de conferência) e o **consentimento** (quem autorizou, se foi o responsável, e a data).
- **A foto da aula** é analisada no próprio aparelho em resolução alta (essa cópia é descartada). Uma cópia reduzida (1280 px, até ~220 KB) **é guardada** na coleção `fotos` quando a caixa **Guardar a foto desta aula** está marcada na hora de registrar as presenças. A caixa vem marcada, mas fica bloqueada se alguma criança marcada na foto não tiver autorização de uso de imagem (a tela diz quem); desmarcando essa criança, volta a poder guardar. Adulto não tem esse campo e conta como autorizado.
- No cartão **Foto da aula** (Check-ins), a foto guardada aparece com legenda, **Ver em tela cheia**, **Trocar** e **Remover** (remover não mexe nas presenças). As fotos são buscadas por dia, só quando a tela precisa. Elas serão a base do portal do aluno.
- **Apagar dados do rosto** remove tudo, e o cartão volta para "0 de 3 fotos". Excluir o aluno ou o professor também apaga o rosto.

---

## 5. Onde os dados ficam

### Firebase do GB Admin

Projeto `gbadmin-48ff9`, separado do Diário de Tatame. É usado no **plano gratuito**: sem Blaze e sem Storage.

| Coleção | Conteúdo |
|---|---|
| `painel` | Todos os dados das telas, um documento por tipo ("balde"). |
| `rostos` | Um documento por pessoa (o id é o do aluno ou do professor): `d0`, `d1`, `d2`, `mini`, `consentimento`, `atualizadoEm`. |
| `fotos` | Foto da aula, um documento por aula (o id é `turma_AAAA-MM-DD`): `turmaId`, `data`, `foto` (JPEG em data URL, menos de 360 mil caracteres), `legenda`, `professorId`, `atualizadoEm`. Cabem uns 4 mil fotos na cota gratuita de 1 GB. |
| `acessos` | Portal do aluno: um documento por e-mail liberado (o id é o e-mail): `alunoId`, `nome`, `ativo`. Escrito só pelo painel. |
| `portal` | Portal do aluno: a cópia de cada aluno liberado (`nome`, `faixa`, `graus`, `desdeFaixa`, `ultimaGraduacao`, `presencas`, `proximoPasso`). Escrito só pelo painel. |
| `portalGrade` | Portal do aluno: `atual`, com as turmas adultas, o cronograma, as âncoras do ciclo e os roteiros. Sem dado pessoal. Escrito só pelo painel. |
| `diarios/{alunoId}` | Do aluno: `metaSemanal`, `metaAulasRoxa`, `nascimento`, `sexo`; subcoleção `pesos` (`data`, `kg`). Só o próprio aluno lê e grava. |
| `diarios/{alunoId}/aulas` | Diário de cada aluno, um documento por aula (`turma_data`): `aula` = as anotações do Diário de Tatame num texto JSON de até 20 mil caracteres. Só o próprio aluno lê e grava (nem o painel lê). |
| `portalAulas` | Portal do aluno: quem participou de cada aula adulta dos últimos 30 dias (`turmaId`, `data`, `presentes` = só os nomes). Escrito só pelo painel; qualquer aluno liberado lê. |
| `checkinsAluno` | Check-in feito pelo aluno no celular (`aluno_turma_data`). O painel junta na lista de presença ao abrir e apaga. |
| `alunos`, `turmas`, `checkins` | Coleções da etapa 1. Agora são **só leitura**, porque o conteúdo já foi copiado para o painel. |

### Os "baldes" da coleção `painel` (`js/logica/baldes.js`)

- Há um documento por tipo de dado, no formato `itens: { id: item }`:
  - `alunos`, `professores`, `turmas`, `mensalidades`, `graduacoes`;
  - `despesas`, `eventos`, `avaliacoes`, `planos`, `produtos`, `prospects`;
  - `modelosAula`, `habilidades`, `modelosDoc`, `modelosMsg`, `perfis`, `usuarios`;
  - `comunicacoes`, `acompanhamentos`, `contratos`, `cronograma`.
- Os **check-ins** são separados por mês: `checkins-2026-11`, `checkins-2026-12`...
- `config` guarda a configuração (`valor`), e `meta` guarda a versão e a data em que o banco foi semeado.
- Abrir o painel gasta umas 35 leituras.

### Como uma mudança chega ao banco

- Toda tela muda `store.dados` e chama **`store.salvar()`**. Nenhuma tela grava direto no Firestore.
- O `salvar` compara com a última versão lida do banco e grava **só os itens que mudaram**, num lote só. Ele atualiza item por item (`itens.<id>`), para não apagar o que outra pessoa mudou em outro item do mesmo documento.
- Nada é gravado antes da primeira leitura do banco.
- Antes de gravar, cada campo passa por validação (`js/logica/validar-nuvem.js`): só campos conhecidos, tipos certos e textos com tamanho máximo.

### Vários aparelhos ao mesmo tempo

- O painel fica "ouvindo" o banco. Quando outra pessoa muda algo, a tela se redesenha e mantém a rolagem.
- Se você estiver com uma janela de edição aberta, a atualização espera a janela fechar e é mesclada por cima, sem perder o que você digitou (`js/logica/sincronia.js`).

### Sem internet

- O Firestore guarda uma cópia no aparelho e enfileira as gravações.
- Se a resposta demorar mais de 8 segundos, o aviso diz que a gravação ficou "na fila", e não que foi salva. O sistema nunca diz "salvo" sem ter salvado.

---

## 6. Segurança e privacidade

- **Regras do banco** (`firestore.rules`):
  - só o admin (pelo UID da conta) lê e grava tudo; o aluno liberado só o que é dele (seção 11);
  - os nomes de documento e o formato são conferidos;
  - um rosto só pode ser gravado para um aluno ou professor que já existe no painel, com exatamente 128 números por descritor, miniatura JPEG com menos de 20 mil caracteres e consentimento completo;
  - qualquer outro caminho é negado.
- **Configuração do Firebase** (`js/nuvem/config.js`): os dados de configuração não são secretos. Quem protege os dados são as regras.
- **Cabeçalhos do site** (`vercel.json`):
  - a política de conteúdo (CSP) permite scripts só do próprio site e do Google/Firebase;
  - a página não pode ser aberta dentro de outro site;
  - a câmera só é liberada para o próprio site;
  - o navegador fica obrigado a usar HTTPS.
- **Telas**: todo texto vindo dos dados passa por `esc()` antes de virar HTML. Arquivos importados (grade, currículo, backup) são lidos sem confiar no conteúdo: tamanho limitado, chaves perigosas descartadas e cada item validado.
- **Repositório privado**: ele tem a marca GB e a configuração do banco.
- Os passos de proteção do console do Firebase estão no [PUBLICAR.md](PUBLICAR.md), passo 2:
  - manter o cadastro aberto (o portal do aluno precisa), com as regras barrando quem não foi liberado;
  - ligar a proteção contra enumeração de e-mails;
  - exigir senha mínima de 8 caracteres;
  - autorizar só os domínios usados;
  - restringir a chave do navegador.

---

## 7. Como o código é organizado

**Tecnologia**: HTML, CSS e JavaScript puro (módulos ES), **sem etapa de build**. O que está no repositório é o que vai para o ar.

O Firebase (versão 10.12.2) vem do `gstatic.com`. A face-api fica no próprio site, em `vendor/`.

```
index.html            estrutura da página (menu, topo, área das telas)
css/admin.css         todo o visual (v02 "Dashboard claro")
js/app.js             roteador (#rota/param), menu, topo, desenho das telas
js/menu.js            itens e ícones do menu lateral
js/store.js           o "store": dados em memória + salvar (na demonstração, no localStorage)
js/rota.js            leitura segura do endereço (#aluno/123)
js/foto.js            reduz fotos no aparelho (JPEG, lado máximo e tamanho máximo)
js/rostos.js          detecção e descritores de rosto (face-api), com a busca em pedaços
js/dados-ficticios.js academia de exemplo (gerada com semente fixa)
js/dados-extras.js    exemplos das telas da 2ª leva (planos, eventos, modelos...)
js/telas/             uma tela por arquivo (index.js decide o modo e registra as telas)
js/logica/            regras puras, sem tela (todas testadas)
js/nuvem/             Firebase: login, leitura e gravação do painel e dos rostos
js/ui/                ajudas de interface (folhas, avisos, faixas e gráficos em SVG)
vendor/face-api/      biblioteca e modelos de rosto
img/                  logos, kimono do topo, fundo do login
tests/                testes (node:test), um arquivo por assunto
servidor.py           servidor local com os mesmos cabeçalhos do site publicado
firestore.rules       regras do banco
vercel.json           cabeçalhos de segurança do site
```

**Padrões do código**

- Cada tela exporta `{ titulo, montar(el, params, ctx) }`. `ctx.store` traz os dados.
- Formulários abrem numa **folha** que sobe de baixo (`abrirFolha` em `js/ui/util.js`).
- Datas sempre em texto `AAAA-MM-DD`, com as contas feitas em UTC sobre ano, mês e dia. Assim, o fuso do aparelho não muda nada.
- Regra de negócio vai em `js/logica/` (sem DOM), com teste. A tela só desenha e chama a lógica.
- Os arquivos misturam finais de linha CRLF e LF: ao editar, mantenha o de cada arquivo.

---

## 8. Rodar no computador e testar

Na pasta `C:\xampp\htdocs\gb-admin`:

```powershell
python servidor.py
```

Abra http://localhost:8767. O servidor só atende o próprio computador, só serve o app (testes, documentação e `.git` dão 404) e não deixa o navegador guardar cópia dos arquivos.

Com o Firebase configurado, a página pede login. A demonstração só aparece sem o Firebase configurado.

Para rodar os testes (Node 18 ou mais novo), use o comando abaixo. A regra do projeto é só fazer commit com **fail 0**.

```powershell
npm test
```

Os testes cobrem a lógica pura, as regras do Firestore (por leitura do arquivo), a segurança (escape, importação), os cabeçalhos de publicação e o menu.

---

## 9. O que ainda é simulado ou manual

- **Mensalidades dos meses seguintes**: o painel logado cria a mensalidade do mês da matrícula. Os meses seguintes **não são gerados sozinhos**: use **Financeiro › Novo lançamento**. Na demonstração, os dados de exemplo são refeitos a cada mês.
- **Comunicação**: o envio é simulado. Use **Copiar mensagem** e envie pelo WhatsApp.
- **Permissões**: a tela é ilustrativa. O acesso real é a lista de admins (seção 1).
- **Contratos**: não há assinatura eletrônica. O "assinado" é marcado à mão.
- **Fotos das aulas**: não são guardadas no painel logado. Só a presença confirmada fica.
- **Backup**: exporta JSON. Importar só existe na demonstração.
- **Produtos & estoque**: a tela está pronta no código, mas desligada (fora do menu e sem registro). Os produtos de exemplo ficam no banco.

---

## 10. Onde mexer para mudar uma regra

| Quero mudar... | Arquivo |
|---|---|
| Quem pode entrar | `js/nuvem/config.js` **e** `firestore.rules`, e depois `firebase deploy --only firestore:rules` |
| Aulas e tempo para grau e faixa (valores padrão) | `js/logica/graduacao.js`, ou na tela Configurações |
| Limites do reconhecimento (0,45 e 0,55) | `js/logica/reconhecimento.js` |
| Tamanho dos pedaços da foto de grupo e o filtro do fundo | `js/logica/ladrilhos.js` |
| Tabelas IBJJF de idade e peso | `js/logica/categorias.js` |
| Categorias de despesa | `js/logica/caixa.js` |
| Públicos da Comunicação | `js/logica/publicos.js` |
| Campos dos modelos (`{{...}}`) | `js/logica/modelos.js` |
| Tarefas da rotina do Dashboard | `js/logica/rotina.js` |
| Itens do menu | `js/menu.js` e `registrarTelas()` em `js/telas/index.js` |
| Visual | `css/admin.css` |

Depois de mudar qualquer coisa: rode `npm test`, faça o commit e o `git push`. A Vercel publica sozinha. Mudou `firestore.rules`? Rode também `firebase deploy --only firestore:rules`.

---

## 11. Portal do aluno (`/aluno`)

O aluno adulto entra em `admin-gbsob.vercel.app/aluno` e vê as aulas da academia, a foto do dia e escreve o próprio diário. Desenho completo em `docs/superpowers/specs/2026-11-25-portal-aluno-design.md`. Kids, peso e evolução ficam para depois.

### Como o aluno ganha acesso
1. Na ficha do aluno (painel logado, só adulto), cartão **Portal do aluno**: e-mail e **Liberar acesso**. O e-mail não pode estar liberado para outro aluno.
2. O aluno abre `/aluno`, toca em **Primeiro acesso** e cria a senha (mínimo 8). Chega um e-mail de confirmação.
3. Depois de confirmar o e-mail, ele entra. Sem confirmar, aparece "Confirme o e-mail…"; com e-mail não liberado, "ainda não foi liberado pela academia".
4. **Tirar acesso** apaga a liberação; o diário dele fica guardado. Aluno **trancado** perde a leitura até ser reativado.

### O que o aluno vê
As **telas do Diário de Tatame** (mesmo visual e funções), com os dados do GB Admin:
- **Início:** faixa e graus (da academia), anel de aulas realizadas até a meta, semana, mês e horas de tatame, e a **Grade de hoje** com **Check-in** em cada aula (ou **Feito ✓**).
- **Grade:** a semana (dá para voltar até 4 semanas), o ciclo GB1/GB2 com o tema e as turmas do dia. Tocar numa aula de hoje ou de antes abre a **aula**: qual foi (tema e técnicas do ciclo), o roteiro com horários, a foto da academia e **quem participou**. Quem treinou nela vê **Ver meu diário** e **Editar** (dificuldades, técnicas, anotações); quem não treinou só vê; hoje, no horário, aparece **Fazer check-in**. Só leitura: a grade e o currículo são da academia.
- **Check-in:** o formulário do Diário (foi essa aula ou outra, como saiu cada técnica, dificuldade, o que aprendi, o que revisar, onde sofreu no rola, duração). Só vale na academia (GPS) e de 30 min antes do início até 1 hora depois do fim. Salvar grava a presença (`checkinsAluno`) e o diário.
- **Diário:** a lista das aulas (cada presença registrada pela academia ou pelo check-in vira uma aula), com filtros. **Aula:** a foto que a academia tirou, as anotações, **Editar aula** e **Apagar anotações** (a presença fica).
- **Evolução:** semana, mês, frequência, meu jogo e a linha do tempo dos graus (só o último tem data, a da última graduação).
- **Perfil:** faixa, categoria de idade e de peso (nascimento e sexo informados pelo aluno), peso, meta por semana, aulas até a próxima faixa e Sair. O portal não cai por inatividade.
- Ficam de fora por enquanto: foto do aluno (aula e perfil), aula fora da grade, registrar grau e mexer na grade/currículo.

### Como os dados chegam (espelho)
- O painel é o dono dos dados. Depois de cada salvar e ao abrir, ele grava só o que mudou em `acessos`, `portal` e `portalGrade` (`js/logica/portal-sincronia.js`). Por isso a frequência do aluno atualiza quando alguém usa o painel.
- Ao abrir, o painel também junta os check-ins dos alunos dos últimos 7 dias (`origem: "aluno"`), sem duplicar, e apaga os pendentes.
- Regras: o aluno só lê o próprio `portal`, a grade, as fotos das turmas adultas e o próprio diário; só cria o próprio check-in. Tudo exige e-mail confirmado e acesso `ativo`.

### Código
`aluno/index.html`, `css/aluno.css` e `js/aluno/` (telas, ui e lógica copiadas do Diário de Tatame; `dados.js` e `estado.js` trocam o banco do Diário pelo do GB Admin; `nuvem.js` e `firebase.js` com sessão própria), dados montados em `js/logica/portal-diario.js`, lógica em `js/logica/portal.js`, `portal-checkin.js`, `portal-aluno.js`, `portal-sincronia.js` e `local.js`; no painel, `js/telas/portal-cartao.js` e `js/nuvem/portal.js`.
