# Publicar o GB Admin (etapa 1: login, alunos reais e check-in por rosto)

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
   - **User actions:** desmarque *Enable create (sign-up)*. Só as 2 contas criadas por você entram.
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
- [ ] 5 senhas erradas mostram "Aguarde 60s".
- [ ] Login certo abre o painel com "Bem-vindo, Leandro" e o botão **Sair** no menu.
- [ ] **Configurações › Importar grade do Diário** (antes, no Diário, use **Perfil › Exportar grade para o GB Admin**): aparecem as 15 turmas.
- [ ] **Alunos › Novo aluno**, com "Aluno real" marcado: o aluno aparece com a etiqueta **Real**.
- [ ] Na ficha do aluno real, **Adicionar foto do rosto**: foto só da pessoa, de frente; autorize; aparece "1 de 3 fotos". Repita com mais 1 ou 2 fotos de ângulos diferentes.
- [ ] Numa aula real de hoje, em **Check-ins**, tire uma foto da turma: cada rosto aparece recortado com o aluno sugerido. Confira e confirme.
- [ ] Recarregue a página: os check-ins continuam lá.
- [ ] **Apagar dados do rosto**: o cartão volta para "0 de 3 fotos".
- [ ] **Sair**: volta para o login e os dados do aparelho são apagados.

Se o reconhecimento marcar a pessoa errada como **Reconhecido**, ou deixar quase todo mundo em **Confira**, anote as duas situações. Os limites (0,45 e 0,55) ficam em `js/logica/reconhecimento.js` e são ajustados com esses testes.

## O que fica de fora desta etapa

- Financeiro, graduações, eventos e as demais telas seguem com os dados de exemplo, só no navegador.
- Aluno real não gera mensalidade nem contrato.
- Mudar faixa ou grau de um aluno real pela tela Graduações ainda não vai para o banco.
