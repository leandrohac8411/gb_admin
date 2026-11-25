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

---

## 1. Quem usa e como se entra

### Quem entra

Só entram as contas cadastradas por e-mail e senha no Firebase Authentication (hoje, Leandro e Stephany). A lista de e-mails autorizados fica em **dois lugares**, que precisam ser iguais:

- `js/nuvem/config.js` (`USERS`): define nome e saudação ("Bem-vindo" ou "Bem-vinda");
- `firestore.rules` (`permitido()`): é o que de fato libera o banco.

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
- No aluno real: cartão **Rosto para check-in** (até 3 fotos), **Apagar dados do rosto** e **Excluir aluno**. Excluir apaga também tudo o que aponta para ele.

**Graduações**
- Quem está apto (ver as regras na [seção 3](#3-regras-da-academia-que-o-sistema-aplica)).
- Distribuição dos ativos por faixa.
- Sub-abas Aptos, Todos e Histórico.
- **Dar grau** ou **Trocar faixa**.
- Cartão "Passam para Adultos": crianças que completaram 16 anos.

**Eventos**
- Graduações, seminários, campeonatos e confraternizações.
- Cada evento tem público, vagas e lista de inscritos.
- "Inscrever aptos" preenche as vagas com os aptos.
- Evento passado mostra "Ver participantes".

**Professores**
- Equipe, com faixa, graus, turmas e alunos atendidos.
- **Editar e foto** (painel logado): cadastra o rosto do professor. Na foto da aula, ele aparece como **Professor** e não vira presença.
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
- **Importar currículo (JSON)**, no formato do Diário de Tatame.
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
- Ao editar o valor, é possível aplicar o novo valor aos alunos atuais do plano.
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
- **Matricular** abre o cadastro de aluno já preenchido.
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
- **Ilustrativa**: quem entra de verdade é definido pelos e-mails autorizados (seção 1).

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
6. O **professor**, se tiver rosto cadastrado, aparece como "Professor" e não conta presença.
7. **Sempre é você quem confirma** antes de gravar.

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
- **A foto da aula nunca é guardada no painel logado.** Ela é analisada no próprio aparelho e descartada.
- **Apagar dados do rosto** remove tudo, e o cartão volta para "0 de 3 fotos". Excluir o aluno ou o professor também apaga o rosto.

---

## 5. Onde os dados ficam

### Firebase do GB Admin

Projeto `gbadmin-48ff9`, separado do Diário de Tatame. É usado no **plano gratuito**: sem Blaze e sem Storage.

| Coleção | Conteúdo |
|---|---|
| `painel` | Todos os dados das telas, um documento por tipo ("balde"). |
| `rostos` | Um documento por pessoa (o id é o do aluno ou do professor): `d0`, `d1`, `d2`, `mini`, `consentimento`, `atualizadoEm`. |
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
  - só os e-mails autorizados leem e gravam;
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
  - desligar o cadastro aberto;
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
- **Permissões**: a tela é ilustrativa. O acesso real é a lista de e-mails autorizados.
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
