# GB Admin na nuvem, etapa 1: plano de implementação

> **Para quem executa:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para executar este plano tarefa por tarefa. Os passos usam caixas de seleção (`- [ ]`) para acompanhar o andamento.

**Objetivo:** publicar o GB Admin na Vercel, com login e Firestore (projeto novo, plano grátis), alunos reais e check-in a partir da foto da aula por reconhecimento facial.

**Arquitetura:**
- `store.dados` continua sendo o único modelo em memória que as telas leem.
- Com login, a camada `js/nuvem/` traz alunos reais, rostos, turmas e check-ins do Firestore e os mescla aos dados fictícios. Registros reais vão para a nuvem e nunca para o localStorage.
- O reconhecimento roda no navegador com face-api. A comparação de descritores é lógica pura em `js/logica/reconhecimento.js`.

**Tecnologias:**
- JavaScript puro, com módulos ES e sem build.
- Firebase JS SDK 10.12.2, servido pelo gstatic, a mesma versão do Diário.
- @vladmandic/face-api 1.7.13, com os arquivos dentro do próprio repositório.
- Testes com `node --test`. Publicação na Vercel, como site estático.

**Desenho:** `docs/superpowers/specs/2026-11-23-gb-admin-nuvem-rostos-design.md`

## Restrições globais

- Custo zero: nada de Firebase Storage nem do plano Blaze. Arquivo nenhum vai para a nuvem, só documentos do Firestore.
- Descritor de rosto: exatamente 128 números finitos entre -1 e 1, gravados com 4 casas decimais. Até 3 por aluno, nos campos `d0`, `d1` e `d2`.
- Classificação do rosto: distância ≤ 0,50 é "reconhecido"; até 0,60 é "duvida"; acima disso, "desconhecido". Os valores ficam em constantes exportadas.
- Miniatura `mini`: JPEG de 96 px, com menos de 20.000 caracteres.
- Consentimento `{ por, responsavel, data }` é obrigatório para gravar em `rostos`.
- Só entram os e-mails da lista de `js/nuvem/config.js`, que é a mesma do Diário (Leandro e Stephany). A lista em `firestore.rules` precisa ser idêntica.
- A foto da aula nunca é enviada nem guardada quando houver aluno real nela.
- Todo texto que vai para HTML passa por `esc()`. Campos de texto têm tamanho máximo, como na auditoria `af1ac0a`.
- Commit só com `npm test` em "fail 0". Toda mensagem de commit termina com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- O push é feito pelo Leandro, nunca pelo Claude.

## Pontos de atenção na revisão

1. **Foto da aula sem nenhum rosto, ou com rostos e nenhum aluno cadastrado:** o fluxo antigo, que sugere pela frequência, continua funcionando, e nada quebra. (Teste na Tarefa 2: `reconhecer([], ...)` e `reconhecer(rostos, [])`.)
2. **Dois rostos muito parecidos com o mesmo aluno:** só o mais próximo fica com ele; o outro passa para o próximo candidato ou vira desconhecido. (Teste na Tarefa 2.)
3. **Foto de cadastro com nenhum rosto ou com mais de um:** a gravação é recusada com uma mensagem clara. (Teste na Tarefa 3: `escolherRostoCadastro`.)
4. **Sem internet ou login expirado no meio do uso:** a gravação na nuvem falha com aviso. O dado local não fica dizendo que salvou e a tela não trava. (Teste na Tarefa 6: `salvarComAviso` com uma promessa rejeitada.)
5. **Arquivo de grade adulterado na importação:** turmas inválidas são descartadas, e `__proto__` não polui nada. (Teste na Tarefa 9.)

---

### Tarefa 1: Modelos locais, cabeçalhos da Vercel e o que não vai para a publicação

**Arquivos:**
- Criar:
  - `vendor/face-api/face-api.esm.js`
  - `vendor/face-api/model/`, com os arquivos `ssd_mobilenetv1_model*`, `face_landmark_68_model*` e `face_recognition_model*` (manifestos `.json` e os `.bin`)
  - `vercel.json`
  - `.vercelignore`
- Alterar:
  - `js/rostos.js:3`: `BASE` passa a ser `"/vendor/face-api"`, e o caminho do ESM vira `${BASE}/face-api.esm.js`
  - `servidor.py`: `PERMITIDO` ganha `"vendor/"`; a CSP perde `https://cdn.jsdelivr.net` em `script-src` e em `connect-src`
  - `.gitignore`: acrescentar `grade-diario.json`
- Testar: `tests/publicacao.test.mjs`

**Interfaces:**
- Produz:
  - `vercel.json`, com `headers` para `/(.*)`;
  - `/vendor/face-api/...` servido pelo próprio site.

- [ ] **Passo 1: escrever o teste que falha**

```js
test("vercel.json: CSP sem jsDelivr, com Firebase e cabeçalhos de segurança", () => {
  const v = JSON.parse(readFileSync("vercel.json", "utf8"));
  const h = Object.fromEntries(v.headers.find(x => x.source === "/(.*)").headers.map(x => [x.key, x.value]));
  const csp = h["Content-Security-Policy"];
  assert.ok(!csp.includes("jsdelivr"));
  assert.ok(csp.includes("script-src 'self' 'wasm-unsafe-eval' https://www.gstatic.com"));
  assert.ok(csp.includes("https://*.googleapis.com") && csp.includes("frame-ancestors 'none'"));
  assert.equal(h["X-Frame-Options"], "DENY");
  assert.equal(h["X-Content-Type-Options"], "nosniff");
  assert.ok(h["Strict-Transport-Security"].includes("max-age="));
  assert.ok(h["Permissions-Policy"].includes("camera=(self)") && h["Permissions-Policy"].includes("geolocation=()"));
});
test(".vercelignore tira testes, docs e servidor", () => {
  const l = readFileSync(".vercelignore", "utf8").split(/\r?\n/);
  for (const x of ["tests", "docs", "servidor.py", "grade-diario.json"]) assert.ok(l.includes(x), x);
});
test("rostos.js carrega a face-api do próprio site", () => {
  assert.match(readFileSync("js/rostos.js", "utf8"), /const BASE = "\/vendor\/face-api"/);
});
test("modelos de reconhecimento presentes", () => {
  for (const m of ["ssd_mobilenetv1_model-weights_manifest.json", "face_landmark_68_model-weights_manifest.json", "face_recognition_model-weights_manifest.json"])
    assert.ok(existsSync(`vendor/face-api/model/${m}`), m);
});
```

- [ ] **Passo 2:** rodar `node --test tests/publicacao.test.mjs`. Esperado: FAIL.
- [ ] **Passo 3:** baixar os arquivos.
  - Rodar `npm pack @vladmandic/face-api@1.7.13` numa pasta nova do scratchpad e extrair com `tar`.
  - Copiar `dist/face-api.esm.js` e os 3 modelos listados acima. Nada mais.
- [ ] **Passo 4:** escrever o `vercel.json`.
  - CSP com:
    - `default-src 'self'`
    - `script-src 'self' 'wasm-unsafe-eval' https://www.gstatic.com https://apis.google.com`
    - `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`
    - `font-src 'self' https://fonts.gstatic.com`
    - `img-src 'self' data: blob:`
    - `connect-src 'self' https://*.googleapis.com https://www.gstatic.com`
    - `frame-src https://<projeto>.firebaseapp.com`, por enquanto com o marcador `PROJETO`, que a Tarefa 4 troca
    - `worker-src 'self' blob:`
    - `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`, `upgrade-insecure-requests`
  - Demais cabeçalhos:
    - `nosniff`
    - `X-Frame-Options: DENY`
    - `Referrer-Policy: no-referrer`
    - `Permissions-Policy: geolocation=(), camera=(self), microphone=(), payment=(), usb=()`
    - HSTS com `max-age=31536000; includeSubDomains`
    - `Cross-Origin-Opener-Policy: same-origin-allow-popups`
- [ ] **Passo 5:** escrever o `.vercelignore` e ajustar o `servidor.py`.
- [ ] **Passo 6:** rodar `npm test`. Esperado: fail 0.
- [ ] **Passo 7:** abrir Check-ins no navegador e analisar uma foto. A contagem de rostos tem que funcionar sem nenhuma requisição ao jsDelivr; conferir em `read_network_requests`.
- [ ] **Passo 8:** commit `feat: face-api no próprio site, vercel.json com cabeçalhos de segurança`.

### Tarefa 2: Comparação de rostos (lógica pura)

**Arquivos:**
- Criar: `js/logica/reconhecimento.js`
- Testar: `tests/reconhecimento.test.mjs`

**Interfaces:**
- Produz:
  - `LIMITE_RECONHECIDO = 0.5` e `LIMITE_DUVIDA = 0.6`.
  - `compactar(descritor: ArrayLike<number>) -> number[]`: 128 números arredondados a 4 casas.
  - `descritorValido(d: unknown) -> boolean`: lista de 128 números finitos em [-1, 1].
  - `distancia(a: number[], b: number[]) -> number`: euclidiana.
  - `descritoresDoRosto(doc) -> number[][]`: lê `d0`, `d1` e `d2` válidos de um documento de `rostos`.
  - `reconhecer(rostos: number[][], cadastrados: {alunoId: string, descritores: number[][]}[]) -> {indice: number, alunoId: string|null, distancia: number|null, estado: "reconhecido"|"duvida"|"desconhecido"}[]`: um item por rosto, na ordem de entrada.

- [ ] **Passo 1: escrever os testes que falham**

```js
const v = (x, i = 0) => Array.from({ length: 128 }, (_, k) => (k === i ? x : 0));
test("compactar arredonda a 4 casas e descritorValido confere formato", () => {
  const c = compactar(Float32Array.from(v(0.123456)));
  assert.equal(c[0], 0.1235); assert.equal(c.length, 128);
  assert.ok(descritorValido(c));
  assert.ok(!descritorValido(c.slice(1)) && !descritorValido([...c.slice(1), 2]) && !descritorValido([...c.slice(1), NaN]) && !descritorValido("x"));
});
test("reconhece abaixo de 0,50, dúvida até 0,60, desconhecido acima", () => {
  const cad = [{ alunoId: "a", descritores: [v(0)] }];
  assert.equal(reconhecer([v(0.4)], cad)[0].estado, "reconhecido");
  assert.equal(reconhecer([v(0.55)], cad)[0].estado, "duvida");
  const r = reconhecer([v(0.7)], cad)[0];
  assert.equal(r.estado, "desconhecido"); assert.equal(r.alunoId, null);
});
test("usa a menor distância entre as fotos do aluno", () => {
  const cad = [{ alunoId: "a", descritores: [v(0.9, 1), v(0, 1)] }];
  assert.equal(reconhecer([v(0.1, 1)], cad)[0].estado, "reconhecido");
});
test("um aluno nunca fica com dois rostos: o mais próximo leva", () => {
  const cad = [{ alunoId: "a", descritores: [v(0)] }, { alunoId: "b", descritores: [v(0.45)] }];
  const r = reconhecer([v(0.3), v(0.1)], cad);
  assert.equal(r[1].alunoId, "a");
  assert.equal(r[0].alunoId, "b");
});
test("sem rostos ou sem cadastrados não quebra", () => {
  assert.deepEqual(reconhecer([], [{ alunoId: "a", descritores: [v(0)] }]), []);
  assert.equal(reconhecer([v(0)], [])[0].estado, "desconhecido");
});
test("descritoresDoRosto ignora campos inválidos", () => {
  assert.equal(descritoresDoRosto({ d0: v(0), d1: [1, 2], d2: v(0.1) }).length, 2);
  assert.deepEqual(descritoresDoRosto(null), []);
});
```

- [ ] **Passo 2:** rodar `node --test tests/reconhecimento.test.mjs`. Esperado: FAIL, porque o módulo ainda não existe.
- [ ] **Passo 3: implementar.** Em `reconhecer`, usar este algoritmo guloso:
  1. Calcular, para cada par (rosto, aluno), a menor distância entre o rosto e os descritores do aluno.
  2. Ordenar os pares pela distância, da menor para a maior.
  3. Percorrer os pares e atribuir cada um se o rosto e o aluno ainda estiverem livres e a distância for ≤ `LIMITE_DUVIDA`. O estado é "reconhecido" se a distância for ≤ `LIMITE_RECONHECIDO`, e "duvida" no outro caso.
  4. Os rostos que sobrarem ficam "desconhecido", com `alunoId: null` e `distancia: null`.
- [ ] **Passo 4:** rodar `npm test`. Esperado: fail 0.
- [ ] **Passo 5:** commit `feat: comparação de descritores de rosto com atribuição única`.

### Tarefa 3: Descritores na face-api (navegador)

**Arquivos:**
- Alterar: `js/rostos.js`
- Criar: `js/logica/cadastro-rosto.js`
- Testar: `tests/reconhecimento.test.mjs`, com mais um teste

**Interfaces:**
- Consome: `compactar` (Tarefa 2).
- Produz:
  - `detectarRostos(dataURL)` continua igual e só carrega o detector.
  - `descreverRostos(dataURL) -> Promise<{largura, altura, rostos: {x, y, w, h, confianca, descritor: number[]}[]}>`: carrega também `faceLandmark68Net` e `faceRecognitionNet`, e chama `detectAllFaces(img, opcoes).withFaceLandmarks().withFaceDescriptors()`.
  - Em `js/logica/cadastro-rosto.js`: `escolherRostoCadastro(resultado) -> {ok: true, rosto} | {ok: false, motivo: "nenhum"|"varios"}`. Aceita exatamente 1 rosto com confiança ≥ 0,5. Com vários rostos, aceita o maior se a área dele for pelo menos 4 vezes a do segundo; senão recusa com "varios".

- [ ] **Passo 1: escrever o teste que falha**

```js
test("cadastro: exige um rosto claro", () => {
  const r = (w, c = 0.9) => ({ x: 0, y: 0, w, h: w, confianca: c, descritor: [] });
  assert.deepEqual(escolherRostoCadastro({ rostos: [] }), { ok: false, motivo: "nenhum" });
  assert.equal(escolherRostoCadastro({ rostos: [r(100, 0.3)] }).motivo, "nenhum");
  assert.equal(escolherRostoCadastro({ rostos: [r(100), r(90)] }).motivo, "varios");
  assert.equal(escolherRostoCadastro({ rostos: [r(100), r(40)] }).rosto.w, 100);
});
```

- [ ] **Passo 2:** rodar o teste. Esperado: FAIL.
- [ ] **Passo 3:** implementar `escolherRostoCadastro` e `descreverRostos`.
  - O carregamento dos modelos extras é separado e preguiçoso: `carregarReconhecimento()`, com a mesma ideia de `carregar()`.
- [ ] **Passo 4:** rodar `npm test`. Esperado: fail 0.
- [ ] **Passo 5:** no navegador, com o servidor local, rodar `descreverRostos` numa foto de exemplo com 2 rostos. Esperado: 2 descritores de 128 números e nenhuma violação de CSP no console.
- [ ] **Passo 6:** commit `feat: descritores de rosto na face-api e escolha do rosto de cadastro`.

> **Pausa com o Leandro, antes da Tarefa 4:** criar o projeto Firebase "gb-admin" no plano Spark; ligar Authentication (e-mail e senha) e o Firestore (modo produção, região `southamerica-east1`); criar as 2 contas; mandar a configuração do app da Web (Console › Configurações do projeto › Seus apps). Sem isso, as Tarefas 4 a 9 rodam só no modo "não configurado".

### Tarefa 4: Camada Firebase e regras

**Arquivos:**
- Criar:
  - `js/nuvem/config.js`: `firebaseConfig` e `USERS`, no mesmo formato de `diario-tatame/js/firebase-config.js`
  - `js/nuvem/firebase.js`: cópia da `diario-tatame/js/firebase.js` (mesmas exportações: `configurado`, `auth`, `db`, `entrar`, `sairELimpar`, `redefinirSenha`, `aoMudarUsuario`)
  - `js/nuvem/dados.js`
  - `js/logica/validar-nuvem.js`
  - `firestore.rules`
  - `firebase.json`, só com `{"firestore": {"rules": "firestore.rules"}}`
- Alterar: `vercel.json`, trocando o marcador `PROJETO` pelo `authDomain` real
- Testar: `tests/nuvem.test.mjs`

**Interfaces:**
- Consome: `descritorValido` (Tarefa 2) e `faixaValida` (`js/ui/faixa.js`).
- Produz, em `js/logica/validar-nuvem.js`:
  - `alunoNuvem(a) -> object|null`: só os campos do desenho, com textos cortados (`nome` 80, `telefone` 30), mais `real: true`. Devolve `null` quando a faixa, o status, a categoria ou as datas são inválidos.
  - `rostoNuvem({descritores, mini, consentimento}) -> object|null`: monta `{d0..d2, mini?, consentimento, atualizadoEm}`. Devolve `null` se não houver descritor válido, se houver mais de 3, se `mini` não for um `data:image/jpeg;base64,...` válido ou passar de 20.000 caracteres, ou se faltar `consentimento.por` (texto de 2 a 80 caracteres), `responsavel` (boolean) ou `data` (ISO).
  - `checkinNuvem(c) -> object|null`: `alunoId`, `turmaId`, `data`, `hora`, `origem` ∈ {manual, foto, rosto}.
  - `turmaNuvem(t) -> object|null`: `diaSemana` 0–6, `horario` HH:MM, `programa` até 20, `professor` até 80, `duracaoMin` 1–600, `categoria` adulto ou kids.
- Produz, em `js/nuvem/dados.js`:
  - `ouvirTudo(cb: ({alunos, rostos, turmas, checkins}) => void, erro) -> () => void`, usando `onSnapshot` nas 4 coleções;
  - `salvarAluno(a) -> Promise<string>`;
  - `apagarAluno(id)`, que apaga também `rostos/{id}`;
  - `salvarRosto(alunoId, dados)` e `apagarRosto(alunoId)`;
  - `salvarCheckin(c) -> Promise<string>` e `apagarCheckin(id)`;
  - `salvarTurmas(turmas[])`, em lote, com o id `d-${diaSemana}-${hhmm}`.
  - Toda gravação passa pelo validador correspondente e rejeita com `Error("dado inválido")` quando ele devolve `null`.

- [ ] **Passo 1:** escrever `tests/nuvem.test.mjs`, com:
  - `alunoNuvem` aceitando o aluno 1 do `gerarDados("2026-11-20")` e recusando uma faixa com XSS;
  - `rostoNuvem` recusando a falta de consentimento, 4 descritores e um `mini` com `data:text/html`, e aceitando 1 descritor com consentimento `{por: "Leandro", responsavel: true, data: "2026-11-23"}`;
  - `checkinNuvem` recusando `origem: "x"`;
  - `turmaNuvem` recusando `horario: "25:00"` e `diaSemana: 7`;
  - a lista de e-mails de `firestore.rules` igual às chaves de `USERS`, lendo o arquivo e comparando.
- [ ] **Passo 2:** rodar os testes. Esperado: FAIL.
- [ ] **Passo 3:** implementar os validadores, `config.js`, `firebase.js` e `dados.js`.
- [ ] **Passo 4:** escrever `firestore.rules`, no modelo das regras do Diário:
  - funções `permitido()`, `texto()`, `numeroEntre()` e `dataISO()`;
  - `descritor(v)`: `v is list && v.size() == 128`. A regra não consegue validar cada elemento; isso fica no app.
  - `alunos`: os campos e tamanhos de `alunoNuvem`.
  - `rostos`: `d0` obrigatório e válido por `descritor()`; `d1` e `d2` opcionais; `mini` opcional, string com menos de 20.000 caracteres; `consentimento.por` string de 2 a 80; `consentimento.responsavel is bool`; `dataISO(consentimento.data)`; leitura e exclusão para `permitido()`.
  - `turmas` e `checkins`: os campos dos validadores.
  - Qualquer outro caminho é negado.
- [ ] **Passo 5:** rodar `npm test`. Esperado: fail 0.
- [ ] **Passo 6:** commit `feat: camada Firebase do GB Admin, validadores e regras`.

### Tarefa 5: Login com bloqueio e modo demonstração local

**Arquivos:**
- Criar:
  - `js/logica/tentativas.js`: cópia literal da `diario-tatame/js/logica/tentativas.js`
  - `js/telas/login.js`
- Alterar:
  - `js/telas/index.js`: decidir entre login, demonstração e painel antes de montar o store
  - `index.html`: um contêiner `#login` fora da moldura
  - `css/`: o estilo da tela de login
- Testar:
  - `tests/tentativas.test.mjs`: os 5 testes do Diário, copiados
  - `tests/nuvem.test.mjs`: mais o teste de `modoInicial`

**Interfaces:**
- Consome: `entrar`, `redefinirSenha`, `aoMudarUsuario` e `configurado` (Tarefa 4).
- Produz:
  - `modoInicial({configurado, host, usuario}) -> "login"|"demo"|"painel"`, em `js/logica/validar-nuvem.js`:
    - com usuário autorizado: `"painel"`;
    - sem usuário, num host local (`localhost`, `127.0.0.1`) ou sem configuração: `"demo"`;
    - nos outros casos: `"login"`.
  - Um usuário com e-mail fora de `USERS` é deslogado e cai em `"login"`, com a mensagem "Este e-mail não tem acesso".

- [ ] **Passo 1:** escrever os testes de `modoInicial`, cobrindo as 3 saídas e o host `gb-admin.vercel.app` sem usuário (resultado `"login"`). Copiar os testes de tentativas.
- [ ] **Passo 2:** rodar os testes. Esperado: FAIL.
- [ ] **Passo 3:** implementar a tela de login, copiando o comportamento de `diario-tatame/js/telas/login.js`:
  - contagem regressiva no botão "AGUARDE Ns";
  - aviso "Mais N tentativas";
  - códigos do Firebase tratados;
  - a mesma mensagem no "Esqueci a senha", com no máximo 1 pedido por minuto;
  - `maxlength` de 254 no e-mail e 128 na senha;
  - chave do localStorage `gb-admin:login`.
- [ ] **Passo 4:** em `js/telas/index.js`, montar o painel só no modo `"demo"` ou `"painel"`.
  - No modo demo, mostrar a faixa "Demonstração: dados fictícios, nada vai para a nuvem".
  - No menu, o item "Sair" chama `sairELimpar()` quando o modo é `"painel"`.
- [ ] **Passo 5:** rodar `npm test`. Esperado: fail 0.
- [ ] **Passo 6:** conferir no navegador:
  - no servidor local, abre a demonstração;
  - simulando um host de fora (sobrescrever `modoInicial` pelo console não vale; usar o teste unitário), cai no login;
  - com a configuração real, 5 senhas erradas com um e-mail falso bloqueiam o botão.
- [ ] **Passo 7:** commit `feat: login do GB Admin com bloqueio e modo demonstração local`.

### Tarefa 6: Mesclar os dados reais aos fictícios

**Arquivos:**
- Criar: `js/logica/mesclar.js`
- Alterar:
  - `js/store.js`: `salvar()` grava `paraLocal(store.dados)` em vez de `store.dados`
  - `js/telas/index.js`: no modo painel, `ouvirTudo` → `mesclar` → `desenhar()`
- Testar: `tests/mesclar.test.mjs`

**Interfaces:**
- Consome: `ouvirTudo` (Tarefa 4).
- Produz:
  - `mesclar(ficticios, reais: {alunos, rostos, turmas, checkins}) -> dados`:
    - alunos: `[...ficticios.alunos, ...reais.alunos]`, com `real: true` nos reais;
    - turmas: se houver turmas reais adultas, elas substituem as turmas fictícias com `categoria: "adulto"`, e as kids fictícias ficam;
    - check-ins: os fictícios mais os reais, com `real: true`;
    - `rostosPorAluno`: um `Map` de alunoId para `{descritores, mini, consentimento}`, guardado em `dados.rostos`.
  - `paraLocal(dados) -> dados`: cópia sem registros `real: true` e sem `rostos`.
  - `salvarComAviso(promessa, mensagemOk) -> Promise<boolean>`: mostra um toast de sucesso, ou "Não salvou na nuvem: verifique a internet" se a promessa rejeitar, e devolve se deu certo.

- [ ] **Passo 1:** escrever os testes:
  - mesclar 2 alunos reais e 1 turma real adulta sobre `gerarDados("2026-11-20")`: total de alunos +2; nenhuma turma adulta fictícia sobra; as turmas kids continuam;
  - `paraLocal` sem nenhum `real: true`, sem `rostos` e sem alterar o objeto original;
  - `salvarComAviso(Promise.reject(new Error("x")))` resolvendo `false` e chamando o toast de erro (o toast é injetável no terceiro parâmetro para o teste).
- [ ] **Passo 2:** rodar os testes. Esperado: FAIL.
- [ ] **Passo 3:** implementar. Cada snapshot remescla a partir de uma cópia dos dados fictícios guardada na inicialização. Não acumular.
- [ ] **Passo 4:** rodar `npm test`. Esperado: fail 0.
- [ ] **Passo 5:** commit `feat: dados reais da nuvem mesclados aos fictícios, sem ir para o localStorage`.

### Tarefa 7: Cadastro de aluno real e do rosto, com consentimento

**Arquivos:**
- Alterar:
  - `js/telas/alunos.js` (`abrirFormAluno`, perto da linha 88)
  - `js/telas/aluno.js`
  - `js/ui/` (a etiqueta "Real")
- Testar: `tests/nuvem.test.mjs`, com o teste de `consentimentoPadrao`

**Interfaces:**
- Consome:
  - `salvarAluno`, `salvarRosto`, `apagarRosto` e `apagarAluno` (Tarefa 4);
  - `descreverRostos`, `escolherRostoCadastro` e `compactar` (Tarefas 2 e 3);
  - `salvarComAviso` (Tarefa 6);
  - `comprimirImagem(file, 96, 14000)` de `js/foto.js` para gerar a miniatura de 96 px.
- Produz:
  - `consentimentoPadrao(aluno, usuarioNome, hoje) -> {por, responsavel, data}`: para kids ou menor de 18 anos, `responsavel: true`.
  - O formulário pede que `por` seja preenchido e mostra o texto: "Autorizo o uso da foto do rosto de [nome] apenas para registrar presença nas aulas da GB Sobradinho. Os dados podem ser apagados a qualquer momento." Para responsável: "Sou o responsável por [nome] e autorizo…".

- [ ] **Passo 1:** escrever o teste de `consentimentoPadrao` (kids dá `responsavel: true`; adulto com 30 anos dá `false`).
- [ ] **Passo 2:** rodar o teste. Esperado: FAIL.
- [ ] **Passo 3:** no formulário do aluno, no modo painel, incluir a caixa "Aluno real (salvar no banco)", marcada por padrão em aluno novo. Ao salvar um aluno real, chamar `salvarAluno` e não fazer o `push` local, porque o snapshot traz o aluno.
- [ ] **Passo 4:** no perfil do aluno real, criar o cartão "Rosto para check-in":
  - mostra quantas fotos tem (0 a 3) e a miniatura;
  - botão "Adicionar foto do rosto": ao escolher o arquivo, `descreverRostos`, depois `escolherRostoCadastro`. Se der erro, mostrar "Não achei um rosto" ou "Tem mais de um rosto: use uma foto só da pessoa".
  - depois, o formulário de consentimento e `salvarRosto`;
  - botão "Apagar dados do rosto", com confirmação, que chama `apagarRosto`;
  - aluno fictício não mostra esse cartão.
- [ ] **Passo 5:** rodar `npm test`. Esperado: fail 0.
- [ ] **Passo 6:** conferir no navegador com a configuração real:
  - cadastrar o Leandro com 2 fotos;
  - o documento `rostos/{id}` tem `d0`, `d1`, `mini` e `consentimento`;
  - recarregar mantém tudo;
  - "Apagar dados do rosto" remove o documento.
- [ ] **Passo 7:** commit `feat: aluno real com cadastro de rosto e consentimento`.

### Tarefa 8: Check-in pela foto com reconhecimento

**Arquivos:**
- Alterar: `js/telas/checkins.js` (`abrirAnalise`, linhas 44 a 94) e o CSS da análise
- Testar: `tests/reconhecimento.test.mjs`, com o teste de `recorte`

**Interfaces:**
- Consome:
  - `descreverRostos` (Tarefa 3);
  - `reconhecer` e `descritoresDoRosto` (Tarefa 2);
  - `salvarCheckin` (Tarefa 4);
  - `salvarComAviso` (Tarefa 6).
- Produz: `recorte(rosto, largura, altura, margem = 0.25) -> {x, y, w, h}`, uma caixa ampliada e presa dentro da imagem. Fica em `js/logica/reconhecimento.js`.

- [ ] **Passo 1:** escrever o teste de `recorte`: um rosto na borda não sai da imagem; a margem de 25% aumenta `w` e `h`.
- [ ] **Passo 2:** rodar o teste. Esperado: FAIL.
- [ ] **Passo 3:** em `abrirAnalise`, quando `d.rostos` tiver algum aluno, usar `descreverRostos` no lugar de `detectarRostos`. Acima da lista de sugestões, mostrar a seção "Reconhecidos na foto":
  - uma linha por rosto, com o recorte desenhado num canvas a partir da foto;
  - um select com o aluno sugerido e a opção "Ninguém / não é aluno";
  - uma etiqueta: verde "Reconhecido", amarela "Confira" ou cinza "Desconhecido";
  - "Reconhecido" vem marcado; "Confira" vem com o aluno escolhido e desmarcado; "Desconhecido" vem com o select em "Ninguém";
  - o mesmo aluno não pode ser escolhido em dois rostos: escolher num rosto limpa o outro.
- [ ] **Passo 4:** ao confirmar:
  - aluno real recebe `salvarCheckin({..., origem: "rosto"})`;
  - aluno fictício recebe o `push` local, como hoje;
  - quando a aula tem algum aluno real reconhecido, a foto não vai para `fotosAula`.
- [ ] **Passo 5:** rodar `npm test`. Esperado: fail 0.
- [ ] **Passo 6:** conferir no navegador uma foto de grupo com 2 alunos cadastrados e 1 pessoa não cadastrada. Esperado:
  - 2 reconhecidos e 1 desconhecido;
  - ao confirmar, 2 documentos em `checkins` com `origem: "rosto"`;
  - nenhuma foto gravada.
- [ ] **Passo 7:** commit `feat: check-in pela foto reconhecendo os alunos reais`.

### Tarefa 9: Grade do Diário para o GB Admin

**Arquivos:**
- No **Diário**:
  - alterar `diario-tatame/js/telas/perfil.js`: botão "Exportar grade para o GB Admin" perto de "Sair" (linha 108);
  - criar `diario-tatame/js/logica/exportar-grade.js`;
  - criar `diario-tatame/tests/exportar-grade.test.mjs`;
  - acrescentar `grade-diario.json` ao `.gitignore` do Diário.
- No **GB Admin**:
  - criar `js/logica/importar-grade.js`;
  - alterar `js/telas/admin.js` (tela `config`): botão "Importar grade do Diário";
  - testar em `tests/importar-grade.test.mjs`.

**Interfaces:**
- Produz:
  - Diário: `gradeParaExportar(grade[]) -> {origem: "diario-tatame", versao: 1, turmas: {diaSemana, horario, programa, professor, duracaoMin}[]}`, só com turmas `ativa !== false`. O arquivo é baixado por um link criado em tempo de execução com `Blob` e `URL.createObjectURL`.
  - GB Admin: `lerGradeDiario(texto: string) -> {turmas: object[], descartadas: number}`:
    - parse com o reviver anti-`__proto__` do `admin.js`;
    - recusa arquivo com mais de 200 KB ou com `origem` diferente de `"diario-tatame"`, lançando `Error("arquivo não é uma grade do Diário")`;
    - cada turma passa por `turmaNuvem` com `categoria: "adulto"`;
    - `programa` "a definir" vira "GB1+GB2".
- Consome: `salvarTurmas` (Tarefa 4).

- [ ] **Passo 1:** escrever os testes:
  - no Diário, `gradeParaExportar` deixa de fora a turma inativa e campos estranhos, como `aula`;
  - no GB Admin, `lerGradeDiario` aceita as 15 turmas da grade inicial do Diário, descarta `horario: "99:99"`, recusa a origem errada e não polui com `{"__proto__":{"x":1}}`.
- [ ] **Passo 2:** rodar os testes. Esperado: FAIL.
- [ ] **Passo 3:** implementar os dois lados. A importação mostra "15 turmas importadas, 0 descartadas" e chama `salvarTurmas`.
- [ ] **Passo 4:** rodar `npm test` nos dois projetos. Esperado: fail 0 nos dois.
- [ ] **Passo 5:** commit no Diário `feat: exportar grade para o GB Admin`. Commit no GB Admin `feat: importar grade do Diário`.

### Tarefa 10: Auditoria da etapa e roteiro de publicação

**Arquivos:**
- Criar: `docs/PUBLICAR.md`, com os passos do Leandro em ordem:
  1. Confirmar que o repositório `gb_admin` está privado.
  2. `git remote add origin https://github.com/leandrohac8411/gb_admin.git`. Este passo o Claude pode rodar; ele só configura.
  3. `git push -u origin master`.
  4. Importar na Vercel, sem build, com o diretório raiz `/`.
  5. Em Firebase › Authentication › Settings › Authorized domains, adicionar o domínio da Vercel.
  6. `firebase deploy --only firestore:rules`.
  7. Desligar a criação de contas; ligar a proteção de enumeração de e-mail.
  8. Restringir a chave da API ao domínio da Vercel.
- Testar: a suíte inteira e uma passada manual.

- [ ] **Passo 1:** XSS: pôr o payload `<img src=x onerror=alert(1)>` no nome do aluno real, no `consentimento.por` e na turma importada, e abrir Alunos, o perfil, Check-ins e a análise. Esperado: 0 alertas.
- [ ] **Passo 2:** servir com os cabeçalhos do `vercel.json`, usando um servidor de teste no scratchpad no mesmo modelo do `csp_server.py`, e fazer login, cadastro de rosto e reconhecimento. Esperado: nenhuma violação de CSP.
- [ ] **Passo 3:** pelo console do navegador, tentar gravar direto no Firestore um `rostos` sem consentimento, um descritor com 127 números e uma coleção desconhecida. Esperado: `permission-denied` nos 3 casos, depois das regras publicadas.
- [ ] **Passo 4:** conferir que o `localStorage` (`gb-admin:v8`) não tem nenhum aluno real nem descritor.
- [ ] **Passo 5:** rodar `npm test`. Esperado: fail 0. Escrever o `docs/PUBLICAR.md` e configurar o `git remote add`.
- [ ] **Passo 6:** commit `docs: roteiro de publicação da etapa 1`.
