# GB Admin na nuvem: etapa 1 (login, alunos reais e check-in por reconhecimento facial)

Data: 23/11/2026

## Por quê

O GB Admin até agora rodou só no computador, com uma academia fictícia guardada no navegador. O Leandro quer testar o painel de verdade:
- aberto pelo celular, publicado na Vercel;
- com dados num banco de dados;
- com fotos reais de alguns alunos, para ver se a foto da aula reconhece quem estava e lança o check-in dessas pessoas.

O objetivo desta etapa é provar o reconhecimento de rostos em condições reais, sem esperar a migração do painel inteiro para o banco.

## Metas

- Publicar o código no repositório `github.com/leandrohac8411/gb_admin` (o push é feito pelo Leandro) e o site na Vercel.
- Criar um projeto Firebase novo, só do GB Admin, no plano grátis (Spark): login por e-mail e senha mais Firestore.
- Login obrigatório no site publicado. Só os e-mails de uma lista autorizada entram, como no Diário: Leandro e Stephany, os mesmos dois e-mails do Diário.
- Cadastrar alunos reais e, para cada um, de 1 a 3 fotos do rosto, com consentimento registrado.
- Na foto da aula, reconhecer cada rosto, sugerir o aluno correspondente e lançar os check-ins depois da confirmação.

## Não-metas (ficam para as próximas etapas)

- Levar financeiro, graduações, eventos, kids, gestão e as demais telas para o banco. Elas continuam com os dados fictícios no navegador.
- Check-in automático sem ninguém conferir.
- Aluno fazendo o próprio check-in ou tendo acesso ao painel.
- Guardar a foto da aula na nuvem.

## O que não pode acontecer (anti-metas)

- Vazar foto ou dado biométrico de aluno, principalmente das crianças.
- Lançar presença para a pessoa errada sem que o professor veja.
- Gerar qualquer custo (nada de plano Blaze nem serviço pago).
- Uma falha no painel afetar o Diário de Tatame. Por isso são projetos Firebase separados.

## Restrições

- Plano grátis do Firebase, que não inclui Storage para projetos novos. Nenhum arquivo vai para o Storage.
- Dado de rosto é dado pessoal sensível (LGPD, art. 11). Exige consentimento específico e, para menores, consentimento do responsável (art. 14). Nesta etapa os alunos reais são adultos que autorizaram e os filhos do Leandro, que autoriza como responsável.
- O repositório precisa ser privado: tem a marca GB e vai ter configuração ligada a dados reais.
- O app segue em JavaScript puro, com módulos ES e sem build, como hoje. A Vercel serve os arquivos estáticos.
- As proteções da auditoria de 23/11 continuam valendo: escape de HTML, CSP, cabeçalhos e limites nos campos.

## Formas consideradas

1. **Projeto Firebase novo, só do GB Admin, por etapas (escolhida).** Isolamento total do Diário, custo zero, e o reconhecimento fica testável logo.
2. **Reaproveitar o projeto Firebase do Diário.** Menos configuração, mas mistura dados e regras: um erro nas regras do painel poderia expor o diário do casal. Descartada.
3. **Supabase grátis.** Tem 1 GB para arquivos, mas o projeto pausa após 1 semana sem uso e seria uma tecnologia nova só para este app. Descartada.

Quanto ao tamanho, foi considerado migrar tudo de uma vez. O Leandro escolheu ir por etapas.

## Como funciona o reconhecimento

Não se comparam fotos, e sim números:
- **Cadastro:** o navegador encontra o rosto na foto e calcula um descritor de 128 números (modelos `faceLandmark68Net` e `faceRecognitionNet` da face-api, além do detector que já usamos). Só o descritor vai para o banco.
- **Foto da aula:** o navegador calcula o descritor de cada rosto e mede a distância euclidiana até cada descritor cadastrado. A distância de um aluno é a menor entre as fotos dele.
- **Classificação de cada rosto:**
  - distância ≤ 0,50: **reconhecido**, marcado na lista;
  - de 0,50 a 0,60: **dúvida**, mostra o aluno provável desmarcado;
  - acima de 0,60: **desconhecido**.
  - Os limites ficam numa constante, para ajustar com os testes reais.
- **Atribuição:** a mesma pessoa não é atribuída a dois rostos. A atribuição é gulosa, começando pela menor distância.
- **Conferência:** a tela mostra o recorte de cada rosto ao lado do aluno sugerido. O professor confirma, troca o aluno ou desmarca. Só então os check-ins são gravados, com `origem: "rosto"`.
- Rostos de alunos sem descritor cadastrado continuam aparecendo como "desconhecido", e a lista manual de hoje (por frequência) segue disponível logo abaixo.

A foto da aula é analisada no aparelho. Ela não vai para o banco e não é guardada para os alunos reais.

## Dados no Firestore

Coleções e campos:
- `alunos/{id}`: `nome`, `faixa`, `graus`, `categoria` (adulto/kids), `status`, `nascimento?`, `desde`, `telefone?`, `criadoEm`.
- `rostos/{alunoId}`:
  - `d0`, `d1`, `d2`: listas de 128 números com 4 casas decimais. O Firestore não aceita lista dentro de lista, por isso são campos separados.
  - `mini?`: miniatura JPEG de 96 px em base64, até cerca de 12 KB, só para o professor reconhecer na tela.
  - `consentimento`: `{ por, responsavel: bool, data }`.
  - `atualizadoEm`.
- `turmas/{id}`: copiadas uma vez da grade real do Diário (decisão do Leandro). O caminho:
  1. Um script local, `ferramentas/exportar-grade-diario.mjs`, lê a coleção `grade` do projeto do Diário com a `service-account.json` que já existe na máquina e gera `grade-diario.json`. Esse arquivo fica fora do Git.
  2. Na tela Admin do GB Admin, o botão "Importar grade do Diário" lê esse arquivo, valida cada turma (dia 0–6, horário HH:MM, programa e professor com tamanho limitado) e grava em `turmas`.
  3. Daí em diante as turmas são do GB Admin; os dois projetos não ficam ligados.
  4. Enquanto a grade não for importada, os check-ins reais usam a grade fictícia.
- `checkins/{id}`: `alunoId`, `turmaId`, `data`, `hora`, `origem` (manual/foto/rosto).

Regras do Firestore:
- Lista de e-mails autorizados.
- Validação de tipo e tamanho em cada campo, como no Diário.
- Descritor exatamente 128 números entre -1 e 1.
- `mini` com menos de 20.000 caracteres.
- Consentimento obrigatório para gravar `rostos`.

Apagar o aluno ou usar "Apagar dados do rosto" remove o documento de `rostos` por inteiro (direito de exclusão).

## Como o painel junta os dois mundos

- **Sem login:** mostra a tela de login. No servidor local (`servidor.py`) ainda dá para usar a demonstração fictícia sem login, pelo botão "Ver demonstração".
- **Com login:**
  - alunos, turmas, check-ins e rostos vêm do Firestore e entram em `store.dados`;
  - os alunos reais aparecem junto com os fictícios, com a etiqueta "Real";
  - telas ainda não migradas, como Financeiro, mostram só os fictícios.
- **Gravação:** salvar um aluno real, um rosto ou um check-in de aluno real grava no Firestore. O resto continua no navegador.
- **Offline:** a persistência local do Firestore fica ligada, como no Diário. Ao sair da conta, ela é apagada, como no Diário.

## Segurança

- **Login:** bloqueio de 1 minuto após 5 erros (a mesma lógica de `tentativas.js` do Diário), mensagens que não revelam se o e-mail existe e limite no "Esqueci a senha".
- **`vercel.json`:**
  - a CSP do `servidor.py`, mais os domínios do Firebase (`*.googleapis.com`, `www.gstatic.com`, o domínio do auth);
  - HSTS, nosniff, `frame-ancestors 'none'`, `Permissions-Policy`;
  - a câmera fica permitida para `self`, porque a foto pode vir da câmera do celular.
- **Modelos da face-api** (cerca de 12 MB) ficam no próprio repositório, em `modelos/`. Isso tira a dependência do jsDelivr em produção, que foi uma recomendação da auditoria.
- **Fora da publicação:** `.vercelignore` tira `tests/`, `docs/` e `servidor.py`.

## O que o Leandro faz (não dá para fazer daqui)

1. Confirmar que o repositório `gb_admin` está privado e fazer o push.
2. Criar o projeto Firebase "gb-admin" (Spark), ligar Authentication por e-mail e senha, criar o Firestore e criar as contas dos e-mails autorizados.
3. Importar o repositório na Vercel.
4. Publicar as regras com `firebase deploy --only firestore:rules`.

As instruções vão passo a passo no fim do plano.

## Testes

- **Automáticos (node):**
  - comparação de descritores e atribuição gulosa;
  - limites de reconhecido, dúvida e desconhecido;
  - validação do descritor e do consentimento antes de gravar;
  - junção de dados reais e fictícios.
- **No navegador:**
  - cadastro de rosto com foto real;
  - foto de grupo com 2 ou 3 rostos cadastrados e 1 desconhecido;
  - check-in lançado;
  - "Apagar dados do rosto";
  - login com bloqueio;
  - CSP sem violações.

## Decisões deixadas a quem constrói (marcadas como chamada do Claude)

- Nome exato das telas e textos, seguindo o tom do painel.
- Tamanho da miniatura (96 px) e qualidade do JPEG.
- Limites 0,50 e 0,60: valores comuns da face-api, a ajustar no teste real.
- Copiar a grade do Diário por arquivo exportado (script local mais importação), em vez de o painel acessar o projeto do Diário.
- Alunos reais misturados aos fictícios, com a etiqueta "Real", em vez de uma lista separada.
- Modo demonstração sem login só no servidor local.
