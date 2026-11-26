# Publicar o GB Admin (etapa 2: tudo no banco)

Passos em ordem. Os comandos são para o PowerShell, rodados dentro de `C:\xampp\htdocs\gb-admin`.

## 1. GitHub

1. Em https://github.com/leandrohac8411/gb_admin › **Settings**, confira que o repositório está **Private**. Ele tem a marca GB e a configuração do banco.
2. O endereço do repositório (`origin`) já está configurado. Envie o código:

   ```powershell
   git push -u origin master
   ```

## 2. Firebase (projeto `gbadmin-48ff9`)

1. Publique as regras do banco. O arquivo `.firebaserc` aponta para o projeto do GB Admin, então as regras **não** vão para o Diário.

   ```powershell
   firebase deploy --only firestore:rules
   ```

   Confira na saída a linha `Project Console: .../project/gbadmin-48ff9/...`.
2. **Authentication › Settings:**
   - **User actions:** deixe **marcado** *Enable create (sign-up)*. O portal do aluno (`/aluno`) precisa disso para o aluno criar a senha no **Primeiro acesso**. Quem cria conta sem ter o e-mail liberado na ficha (e confirmado) não lê nada: as regras do banco barram.
   - **Sign-in method › E-mail/senha:** ligado (é o login do painel e do portal).
   - **User account management / Email enumeration protection:** ligue.
   - **Password policy:** mínimo de 8 caracteres.
   - **Authorized domains:** depois do passo 3, adicione o endereço da Vercel (por exemplo `gb-admin-xxxx.vercel.app`).
3. Opcional: o Google Analytics ficou ligado na criação do projeto. O painel não usa Analytics, e pode ser desligado em **Configurações do projeto › Integrações**.

## 3. Vercel

1. **Add New › Project** e importe `gb_admin`.
2. **Framework Preset:** *Other*. **Build Command:** vazio. **Output Directory:** vazio (a raiz).
3. Clique em **Deploy**. Os cabeçalhos de segurança vêm do `vercel.json`. Testes, documentação e servidor local ficam de fora (`.vercelignore`).
4. Volte ao passo 2.2 e adicione o domínio da Vercel em *Authorized domains*.
5. Google Cloud › **APIs e serviços › Credenciais** (projeto `gbadmin-48ff9`): restrinja a chave do navegador ao domínio da Vercel e a `localhost`.

## 4. Testes que só você consegue fazer (com a sua senha)

Faça no celular, no site da Vercel:

- [ ] Sem login, o site abre na tela de login, nunca no painel.
- [ ] 5 senhas erradas mostram "AGUARDE 60s" no botão.
- [ ] Login certo abre o painel com "Bem-vindo, Leandro" e o botão **Sair** no menu.
- [ ] **Configurações › Importar grade do Diário** (antes, no Diário, use **Perfil › Exportar grade para o GB Admin**): aparecem as 15 turmas.
- [ ] No 1º acesso, depois do login, aparece "Carregando…" e o painel abre com os dados de exemplo. Eles foram copiados para o banco junto com os alunos, turmas e check-ins que você já tinha.
- [ ] **Alunos › Novo aluno** com uma **Foto do rosto**: o aluno aparece com a etiqueta **Real** e abre a autorização do uso do rosto. Ao autorizar, aparece "Rosto salvo".
- [ ] Edite qualquer coisa (uma mensalidade paga, um evento, a configuração), recarregue a página e confira que continua lá. Abra no celular: a mudança aparece lá também.
- [ ] Se aparecer "o banco recusou" ou "Não consegui abrir os dados", as regras do passo 2.1 não estão publicadas (ou estão na versão antiga): rode `firebase deploy --only firestore:rules` de novo.
- [ ] Na ficha do aluno real, **Adicionar foto do rosto**: foto só da pessoa, de frente; autorize; aparece "1 de 3 fotos". Repita com mais 1 ou 2 fotos de ângulos diferentes.
- [ ] **Professores › Editar e foto**: escolha uma foto do rosto do professor e salve; autorize; o cartão passa a mostrar "rosto cadastrado". Na foto da aula, o rosto dele aparece como **Professor** e não vira presença.
- [ ] Numa aula real de hoje, em **Check-ins**, tire uma foto da turma: cada rosto aparece recortado com o aluno sugerido. Confira e confirme.
- [ ] Recarregue a página: os check-ins continuam lá.
- [ ] **Apagar dados do rosto**: o cartão volta para "0 de 3 fotos".
- [ ] **Sair**: volta para o login e os dados do aparelho são apagados.

Se o reconhecimento marcar a pessoa errada como **Reconhecido**, ou deixar quase todo mundo em **Confira**, anote as duas situações. Os limites (0,45 e 0,55) ficam em `js/logica/reconhecimento.js` e são ajustados com esses testes.

## 5. Portal do aluno (`/aluno`)

Depois do `git push` e do `firebase deploy --only firestore:rules` (as regras do portal estão no mesmo arquivo):

- [ ] No painel, abra a ficha de um aluno adulto (pode ser você) e, no cartão **Portal do aluno**, digite o e-mail e toque em **Liberar acesso**.
- [ ] No celular, abra `admin-gbsob.vercel.app/aluno` e toque em **Primeiro acesso**. Crie a senha (mínimo 8 caracteres).
- [ ] Abra o e-mail de confirmação (veja o spam), toque no link e volte ao portal. Toque em **Já confirmei**.
- [ ] Aparece o **Início** com a sua faixa, os graus e as aulas de hoje. Em **Aulas**, as aulas de cada dia, com a foto quando tiver.
- [ ] Na academia, no horário de uma aula: **Check-in**. Ele pede a localização. Depois, abra o painel: a presença aparece em **Check-ins** (pode levar até abrir ou recarregar o painel).
- [ ] Na aula com presença, escreva o **Meu diário** e salve. Recarregue: continua lá.
- [ ] Teste com um e-mail **não** liberado: ele cria a conta, mas o portal diz "ainda não foi liberado pela academia".
- [ ] No painel, **Tirar acesso**: o aluno deixa de ver o portal (ao recarregar).

## Como os dados ficam guardados (etapa 2)

- Tudo o que se cadastra ou edita no painel vai para o banco, na coleção `painel`: um documento por tipo de dado, e os check-ins separados por mês. Abrir o painel gasta umas 35 leituras.
- Os dados de exemplo também estão no banco. Quando a academia real estiver cadastrada, use **Apagar dados de exemplo** (menu lateral ou Configurações). Os dados reais não são tocados.
- O rosto fica na coleção `rostos`, com regras próprias e mais rígidas.
- As coleções `alunos`, `turmas` e `checkins` da etapa 1 ficam só para leitura: no 1º acesso, o conteúdo delas foi copiado para o painel.
- As fotos das aulas continuam não sendo guardadas no modo logado.
