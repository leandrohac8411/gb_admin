# Portal do aluno (`/aluno`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `admin-gbsob.vercel.app/aluno` com login de aluno liberado pelo painel, início (faixa, frequência, próximo passo), aulas com tema, roteiro e foto, diário da aula e check-in por GPS, tudo no Firebase do GB Admin.

**Architecture:** Caminho A do desenho. O painel continua dono dos dados (baldes de `painel`) e, ao salvar e ao abrir, grava um espelho em coleções pequenas do portal (`acessos`, `portal`, `portalGrade`). O aluno lê só o espelho dele, escreve o próprio diário (`diarios`) e o check-in (`checkinsAluno`), que o painel junta na lista de presença. A lógica é pura, em `js/logica/` com testes; a parte Firebase fica fina, em `js/nuvem/`.

**Tech Stack:** JS puro (módulos ES, sem build), Firebase 10.12.2 (Auth e Firestore) da gstatic, `node --test`, Vercel.

**Spec:** `docs/superpowers/specs/2026-11-25-portal-aluno-design.md`

## Global Constraints

- Custo zero: plano gratuito do Firebase, sem Cloud Functions, Storage ou Blaze.
- Mesmo repositório e mesmo deploy do GB Admin; JS puro, sem build; SDK `https://www.gstatic.com/firebasejs/10.12.2/…`.
- CSP com `script-src 'self'` (nada de script inline). `/aluno` com `geolocation=(self)`; o painel continua com `geolocation=()`.
- Kids fora: só aluno com `categoria` adulto (ou sem categoria) pode ser liberado; `portalGrade` só tem turmas adultas.
- Manter o final de linha de cada arquivo (LF nos novos).
- Commit só com `npm test` em fail 0, mensagem terminando em `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Push e `firebase deploy` são do Leandro.
- Nada de teste contra produção: verificação no navegador pela cópia `img/_teste` (gitignored) com `js/nuvem/*` falsos.
- Textos da tela em português do Brasil, no tom do painel.

## Review Focus

1. Aluno com acesso liberado e depois **trancado**: deve perder a leitura (`acessos.ativo == false`), e voltar ao reativar. Teste em Task 1 (`espelhoAcesso`).
2. Check-in **repetido** (dois toques, ou o professor já marcou a presença): não pode duplicar a presença no painel. Teste em Task 2 (`juntarCheckinsAluno`).
3. Turma **removida ou trocada de horário** depois da aula: a aula antiga continua legível no portal (presença guarda `horario` e `programa`). Teste em Task 1 (`espelhoAluno`).
4. Diário com texto **gigante** ou dificuldade fora de 1 a 5: recusado pelo app e pela regra. Teste em Task 5 (`diarioValido`).
5. Check-in **fora do horário** (sem turma acontecendo) ou com **duas turmas no mesmo horário**: o app diz que não há aula agora ou pergunta qual é. Teste em Task 2 (`turmaDoCheckin`).

---

### Task 1: Espelho do portal (lógica pura)

**Files:**
- Create: `js/logica/portal.js`
- Test: `tests/portal.test.mjs`

**Interfaces:**
- Consumes: `aptidao(aluno, checkins, hojeISO)` de `js/logica/graduacao.js`; `temaDaAula` não é usado aqui.
- Produces:
  - `podeTerAcesso(aluno) -> boolean`: adulto (categoria `"adulto"` ou ausente).
  - `emailValido(texto) -> string|null`: minúsculas e sem espaços, ou null.
  - `espelhoAluno(d, aluno, hojeISO) -> { nome, faixa, graus, desdeFaixa, ultimaGraduacao, presencas: [{ data, turmaId, hora, horario, programa }], proximoPasso: { tipo, aulas, faltamAulas, proximaFaixa } }`, com as presenças em ordem de data decrescente.
  - `espelhoAcesso(aluno, email) -> { alunoId, nome, ativo }`: `ativo` = `aluno.status === "ativo"`.
  - `espelhoGrade(d) -> { turmas: { [id]: { diaSemana, horario, programa, professor, modeloAulaId, aula } }, cronograma, ancoras, modelosAula }`, só turmas adultas e só os campos citados.
  - `mudancasEspelho(anterior: Map<string,string>, novos: Map<string,object>) -> { gravar: [[id, obj]], apagar: [id] }`: compara por `JSON.stringify` canônico.

- [ ] **Step 1: Write the failing tests** em `tests/portal.test.mjs`:
  - `espelhoAluno`: com 2 presenças da turma `t1` ("GB1", 12:30) e 1 de turma que não existe mais, o resultado lista as 3, a removida com `horario: ""` e `programa: ""`, mais recente primeiro; `proximoPasso` igual a `aptidao(...)`.
  - `espelhoAcesso`: aluno ativo dá `ativo: true`; trancado dá `ativo: false`.
  - `podeTerAcesso`: kids dá false; adulto e sem categoria dão true.
  - `emailValido(" Ana@X.com ")` dá `"ana@x.com"`; `"ana"` dá null.
  - `espelhoGrade`: turma kids fica fora; a turma adulta tem `professor` = nome do professor e nenhum campo além dos listados; o resultado não contém nenhum id ou nome de aluno (`JSON.stringify` sem os nomes dos alunos de `d`).
  - `mudancasEspelho`: igual, não grava; mudou, grava; sumiu do novo, apaga.
- [ ] **Step 2:** `node --test tests/portal.test.mjs`. Expected: FAIL (módulo não existe).
- [ ] **Step 3:** Implementar `js/logica/portal.js` com as funções acima.
- [ ] **Step 4:** `npm test`. Expected: tudo passa, fail 0.
- [ ] **Step 5:** Commit "Portal do aluno: espelho do painel (lógica)".

### Task 2: Check-in do aluno (lógica pura)

**Files:**
- Create: `js/logica/portal-checkin.js`, `js/logica/local.js` (copiar de `C:\xampp\htdocs\diario-tatame\js\logica\local.js`, mesmo `ACADEMIA`)
- Test: `tests/portal-checkin.test.mjs`

**Interfaces:**
- Produces:
  - `turmaDoCheckin(turmas: object[], diaSemana: number, minutosAgora: number) -> { turma } | { escolher: turma[] } | { nenhuma: true }`: turma acontecendo = de 30 minutos antes do início até o fim (início + `duracaoMin` ou 60).
  - `idCheckinAluno(alunoId, turmaId, data) -> string` = `${alunoId}_${turmaId}_${data}`.
  - `juntarCheckinsAluno(checkins: object[], pendentes: object[], novoId: (p) => string) -> { novos: object[], apagar: string[] }`: cada pendente vira `{ id, alunoId, turmaId, data, hora, origem: "aluno" }`, a não ser que já exista presença do mesmo aluno, turma e data; os dois casos entram em `apagar` (id do pendente).
  - `avaliarLocal`, `distanciaTexto`, `ACADEMIA` (de `local.js`).
- [ ] **Step 1: Write the failing tests:** turma das 12:30 às 12:00 é escolhida; às 11:59 não há nenhuma; duas turmas às 19:00 dão `escolher` com as duas; pendente já presente não duplica e é apagado; dois pendentes iguais viram uma presença só; `avaliarLocal` a 40 m dá ok e a 80 m não.
- [ ] **Step 2:** Rodar. Expected: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npm test`, fail 0.
- [ ] **Step 5:** Commit "Portal do aluno: regras do check-in pelo celular".

### Task 3: Regras do Firestore e acesso do painel

**Files:**
- Modify: `firestore.rules`
- Create: `js/nuvem/portal.js` (lado do painel)
- Test: `tests/regras-portal.test.mjs` (confere o texto das regras: funções e coleções presentes, sem `allow write: if true`)

**Interfaces:**
- Produces (`js/nuvem/portal.js`):
  - `liberarAcesso(email, acesso)` grava `acessos/{email}` = `{ ...acesso, liberadoEm: serverTimestamp() }`.
  - `tirarAcesso(email)` apaga.
  - `gravarEspelho({ gravar, apagar }, colecao)` em lote (`writeBatch`, no máximo 400 por lote).
  - `checkinsPendentes(desdeISO)` lê `checkinsAluno` com `data >= desdeISO`.
  - `apagarCheckinsAluno(ids)`.
- Regras novas (exatas):

```
function aluno() {
  return request.auth != null && request.auth.token.email_verified == true
    && exists(/databases/$(database)/documents/acessos/$(request.auth.token.email))
    && get(/databases/$(database)/documents/acessos/$(request.auth.token.email)).data.ativo == true;
}
function meuAlunoId() { return get(/databases/$(database)/documents/acessos/$(request.auth.token.email)).data.alunoId; }

match /acessos/{email} {
  allow read: if permitido() || (request.auth != null && request.auth.token.email == email && request.auth.token.email_verified == true);
  allow write: if permitido();
}
match /portal/{alunoId} { allow read: if permitido() || (aluno() && alunoId == meuAlunoId()); allow write: if permitido(); }
match /portalGrade/{id} { allow read: if permitido() || aluno(); allow write: if permitido(); }
match /diarios/{alunoId}/aulas/{aulaId} {
  allow read, delete: if aluno() && alunoId == meuAlunoId();
  allow create, update: if aluno() && alunoId == meuAlunoId() && diarioOk(request.resource.data);
}
match /checkinsAluno/{id} {
  allow read: if permitido() || (aluno() && resource.data.alunoId == meuAlunoId());
  allow delete: if permitido();
  allow create: if aluno() && request.resource.data.alunoId == meuAlunoId()
    && id == request.resource.data.alunoId + '_' + request.resource.data.turmaId + '_' + request.resource.data.data
    && checkinOk(request.resource.data);
}
```

  - `diarioOk`: chaves só `aprendi, revisar, dificuldade, tecnicas, turmaId, data, atualizadoEm`; textos até 4000; dificuldade número de 1 a 5; tecnicas lista até 50; `dataISO(data)`; `atualizadoEm == request.time`.
  - `checkinOk`: chaves só `alunoId, turmaId, data, hora, distancia, criadoEm`; `dataISO(data)`; hora `HH:MM`; distancia número de 0 a 50; `criadoEm == request.time`.
  - `fotos`: o `allow read` passa a `permitido() || (aluno() && resource.data.turmaId in get(/databases/$(database)/documents/portalGrade/atual).data.turmas)`.
- [ ] **Step 1:** Teste do texto das regras (falha porque `aluno()` não existe).
- [ ] **Step 2:** Rodar. Expected: FAIL.
- [ ] **Step 3:** Escrever as regras e `js/nuvem/portal.js`.
- [ ] **Step 4:** `npm test`, fail 0.
- [ ] **Step 5:** Commit "Portal do aluno: regras do banco e funções do painel".

### Task 4: Painel grava o espelho, junta check-ins e libera acesso

**Files:**
- Create: `js/logica/portal-sincronia.js`
- Modify: `js/telas/index.js` (depois de `store.salvar()` e na abertura), `js/telas/aluno.js` (cartão "Portal do aluno"); o e-mail fica em `aluno.emailPortal`.
- Test: `tests/portal-sincronia.test.mjs`

**Interfaces:**
- Consumes: Task 1 (`espelhoAluno`, `espelhoAcesso`, `espelhoGrade`, `mudancasEspelho`, `podeTerAcesso`, `emailValido`), Task 2 (`juntarCheckinsAluno`), Task 3 (`js/nuvem/portal.js`).
- Produces: `criarSincroniaPortal({ store, nuvem, hoje }) -> { aposSalvar(), aoAbrir() }`. `nuvem` é o módulo da Task 3, injetado para o teste usar um falso. O espelho grava `portal/*` e `acessos/*` só de quem tem `emailPortal`, e `portalGrade/atual`. Memória das assinaturas na própria instância. `aoAbrir` também busca `checkinsPendentes(somarDias(hoje, -7))` e junta com `juntarCheckinsAluno`.
- [ ] **Step 1: Failing tests** com nuvem falsa:
  - `aoAbrir` grava a grade e o espelho de quem tem e-mail, e nada de quem não tem;
  - um segundo `aposSalvar` sem mudança não grava nada;
  - trancar o aluno regrava `acessos` com `ativo: false`;
  - os pendentes viram `d.checkins` com `origem: "aluno"`, chamam `store.salvar()` e `apagarCheckinsAluno` com os ids certos.
- [ ] **Step 2:** Rodar. Expected: FAIL.
- [ ] **Step 3:** Implementar e ligar no `index.js` (só no modo painel; erro vai para `console.error`, sem quebrar o painel).
- [ ] **Step 4:** Cartão "Portal do aluno" na ficha (só adulto): campo e-mail, **Liberar acesso** (valida com `emailValido`, grava `emailPortal`, chama `liberarAcesso` e `aposSalvar`) e **Tirar acesso** (confirmação; apaga `emailPortal` e o `acessos`). Mensagens: "Acesso liberado. Peça para o aluno abrir admin-gbsob.vercel.app/aluno e tocar em Primeiro acesso." e "Confira o e-mail.".
- [ ] **Step 5:** `npm test`, fail 0. Verificar no `img/_teste` com `js/nuvem/portal.js` falso: liberar mostra a mensagem e o espelho aparece no falso.
- [ ] **Step 6:** Commit "Portal do aluno: painel grava o espelho e libera acesso".

### Task 5: App do aluno — base, login e regras de tela

**Files:**
- Create: `aluno/index.html`, `css/aluno.css`, `js/aluno/app.js` (rotas `#inicio`, `#aulas`, `#aula/<turmaId>/<data>`, `#perfil`), `js/aluno/nuvem.js`, `js/aluno/entrar.js`, `js/logica/portal-aluno.js`
- Modify: `vercel.json` (rewrite `/aluno` para `/aluno/index.html`; header `Permissions-Policy` com `geolocation=(self)` só em `/aluno(.*)`)
- Test: `tests/portal-aluno.test.mjs`

**Interfaces:**
- Produces (`js/aluno/nuvem.js`): `entrar(email, senha)`, `criarConta(email, senha)` (cria e manda a verificação), `reenviarVerificacao()`, `esqueciSenha(email)`, `sair()`, `aoMudarUsuario(cb)`, `lerAcesso(email)`, `ouvirPortal(alunoId, cb)`, `lerGrade()`, `fotosDoDia(data)`, `ouvirDiario(alunoId, cb)`, `salvarDiario(alunoId, aulaId, dados)`, `fazerCheckin(dados)`, `meusCheckins(alunoId, cb)`. Usa o mesmo `firebaseConfig` de `js/nuvem/config.js`.
- Produces (`js/logica/portal-aluno.js`): `diarioValido(x) -> object|null` (mesmos limites do `diarioOk`); `esteveNaAula(portal, pendentes, turmaId, data) -> boolean`; `aulasDoDia(grade, dataISO) -> [{ turmaId, horario, programa, professor, temas, roteiro }]` (usa `temaDaAula` com `{ config: { ancoras }, cronograma }`); `frequenciaDoMes(presencas, mesISO) -> number`; `mensagemDeErroLogin(code) -> string` (pt-BR para `auth/invalid-credential`, `auth/email-already-in-use`, `auth/weak-password`, `auth/too-many-requests`, `auth/network-request-failed`, padrão "Não deu para entrar. Tente de novo.").
- Telas de login: Entrar (e-mail e senha), Primeiro acesso (e-mail, senha e repetir senha, mínimo 6), Esqueci a senha. Depois de entrar: sem e-mail verificado, aparece "Confirme o e-mail que enviamos para X" com Reenviar; sem `acessos` ou com `ativo == false`, "Esse e-mail ainda não foi liberado pela academia." com Sair.
- [ ] **Step 1: Failing tests** de `portal-aluno.js`, incluindo:
  - `diarioValido({ dificuldade: 6 })` dá null;
  - texto de 4001 caracteres dá null;
  - `esteveNaAula` dá true por presença e por pendente;
  - `aulasDoDia` de uma quarta traz a turma GB1 com o tema da Aula B.
- [ ] **Step 2:** Rodar. Expected: FAIL.
- [ ] **Step 3:** Implementar a lógica e a base do app com as telas de login.
- [ ] **Step 4:** `npm test`, fail 0. Verificar no `img/_teste/aluno` com `js/aluno/nuvem.js` falso: as três telas de login, o aviso de e-mail não verificado e o de não liberado, sem estourar a 375px.
- [ ] **Step 5:** Commit "Portal do aluno: base do app e login".

### Task 6: Telas do aluno — início, aulas, aula com diário, check-in, perfil

**Files:**
- Create: `js/aluno/telas/inicio.js`, `aulas.js`, `aula.js`, `checkin.js`, `perfil.js` (visual e textos adaptados do Diário: `C:\xampp\htdocs\diario-tatame\js\telas\inicio.js`, `aula.js`, `checkin.js`)
- Modify: `css/aluno.css`

**Interfaces:**
- Consumes: Task 2 (`turmaDoCheckin`, `avaliarLocal`, `idCheckinAluno`), Task 5 (`js/aluno/nuvem.js`, `portal-aluno.js`).
- **Início:** faixa com graus (`faixaSVG`), "N aulas este mês", próximo passo (`proximoPasso`: "faltam N aulas para o Xº grau", ou "pronto para graduar, fale com o professor") e a aula de agora com o botão **Fazer check-in**.
- **Aulas:** dia a dia (hoje e para trás, `‹ ›`); cada aula com etiqueta do programa, horário, professor, tema, "📸" se tem foto e "Você esteve" se `esteveNaAula`.
- **Aula:** foto (tela cheia), tema, técnicas, roteiro com horários (igual ao cartão do painel). Se esteve: **Meu diário** com o que aprendi, o que revisar, dificuldade de 1 a 5 e técnicas com resultado (não saiu, às vezes, saiu bem), salvando com `diarioValido`. Se não esteve: "Você não fez check-in nesta aula." e nada editável.
- **Check-in:** pede a posição; longe, mostra "Você está a X da academia. O check-in só vale lá."; sem turma agora, "Não tem aula acontecendo agora."; duas turmas, pergunta qual; ok, grava `checkinsAluno` e mostra "Check-in feito! Bom treino.". Repetido no mesmo dia e turma, mostra "Você já fez check-in nesta aula."
- **Perfil:** nome, e-mail e **Sair**.
- [ ] **Step 1:** Implementar as telas.
- [ ] **Step 2:** `npm test`, fail 0.
- [ ] **Step 3:** Verificar no `img/_teste/aluno` com nuvem falsa (espelho e grade de exemplo gerados pelas funções da Task 1 a partir de `dados-ficticios.js`) e geolocalização simulada: o fluxo inteiro (entrar, início, aulas, aula com e sem presença, salvar diário, check-in perto, longe e repetido), a 375px e no computador.
- [ ] **Step 4:** Commit "Portal do aluno: telas do aluno".

### Task 7: Documentação e fechamento

**Files:**
- Modify: `docs/SISTEMA.md` (nova seção "Portal do aluno": como liberar, o que o aluno vê, coleções novas na tabela, regras; o cadastro do Firebase Auth fica aberto, com o motivo), `docs/PUBLICAR.md` (passos do Leandro: push, `firebase deploy --only firestore:rules`, e manter **ativado** o cadastro por e-mail e senha no Firebase Auth).
- [ ] **Step 1:** Escrever.
- [ ] **Step 2:** `npm test`, fail 0; apagar `img/_teste`.
- [ ] **Step 3:** Commit "Portal do aluno: documentação".
