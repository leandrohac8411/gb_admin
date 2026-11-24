// Etapa 2: tudo no banco. Os dados do painel viram "baldes" na coleção painel do Firestore:
// um documento por tipo (alunos, mensalidades...) com itens: { id: item }; os check-ins, um por mês.
// Cada salvar compara com a última versão do banco e grava só os itens que mudaram.
import { COLECOES, VERSAO } from "../dados-ficticios.js";
import { mesclar } from "./mesclar.js";

const copia = x => JSON.parse(JSON.stringify(x));
const objeto = x => !!x && typeof x === "object" && !Array.isArray(x);
let seq = 0;
const idPadrao = p => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`;

// JSON com as chaves em ordem: o Firestore não devolve os campos na ordem em que foram gravados.
export function canonico(x) {
  if (Array.isArray(x)) return `[${x.map(canonico).join(",")}]`;
  if (objeto(x)) return `{${Object.keys(x).sort().filter(k => x[k] !== undefined).map(k => `${JSON.stringify(k)}:${canonico(x[k])}`).join(",")}}`;
  return JSON.stringify(x ?? null);
}

export const chaveDe = (colecao, item) => colecao === "checkins" ? `checkins-${String(item?.data || "0000-00").slice(0, 7)}` : colecao;
const colecaoDe = doc => doc.split("-")[0];
const configSemUsuario = c => { const { usuario, ...resto } = c || {}; return copia(resto); };

// Item sem id (as graduações, por exemplo) ganha um: o id é a chave do item dentro do balde.
export function garantirIds(dados, novoId = idPadrao) {
  for (const c of COLECOES) for (const x of dados[c] || []) {
    if (objeto(x) && (typeof x.id !== "string" || !x.id)) x.id = novoId(c.slice(0, 2));
  }
  return dados;
}

// Dados inteiros → documentos (usado para semear o banco). _o guarda a ordem da lista.
export function paraDocs(dados) {
  const docs = { config: { valor: configSemUsuario(dados.config) }, meta: { versao: dados.versao ?? VERSAO, geradoEm: dados.geradoEm || "" } };
  for (const c of COLECOES) (dados[c] || []).forEach((x, i) => {
    if (!objeto(x) || typeof x.id !== "string") return;
    const doc = chaveDe(c, x);
    (docs[doc] ||= { itens: {} }).itens[x.id] = { ...copia(x), _o: i };
  });
  return docs;
}

// Documentos do banco → dados das telas + base (o que está no banco, para comparar no próximo salvar).
export function deDocs(docs) {
  const meta = docs.meta || {}, valor = docs.config?.valor || {};
  const dados = { versao: meta.versao ?? VERSAO, geradoEm: meta.geradoEm || "", config: copia(valor) };
  const base = { itens: {}, config: canonico(configSemUsuario(valor)) };
  const porColecao = Object.fromEntries(COLECOES.map(c => [c, []]));
  for (const [doc, conteudo] of Object.entries(docs)) {
    const c = colecaoDe(doc);
    if (!porColecao[c] || !objeto(conteudo?.itens)) continue;
    base.itens[doc] = {};
    for (const [id, bruto] of Object.entries(conteudo.itens)) {
      if (!objeto(bruto)) continue;
      const { _o, ...item } = copia(bruto);
      item.id = id;
      const o = Number.isFinite(_o) ? _o : 0;
      porColecao[c].push({ o, item });
      base.itens[doc][id] = { j: canonico(item), o };
    }
  }
  for (const c of COLECOES) dados[c] = porColecao[c].sort((a, b) => a.o - b.o || (a.item.id < b.item.id ? -1 : 1)).map(x => x.item);
  return { dados, base };
}

// O que mudou desde a base. Devolve as escritas por documento e a base já com as mudanças.
// Escrita: { doc, itens: { id: item | null (apagar) } } ou { doc: "config", valor }.
export function diferencas(base, dados, agora = Date.now, novoId = idPadrao) {
  garantirIds(dados, novoId);
  const nova = { itens: Object.fromEntries(Object.entries(base.itens).map(([d, m]) => [d, { ...m }])), config: base.config };
  const porDoc = {}, vistos = {}, ordemAntiga = {};
  for (const m of Object.values(base.itens)) for (const [id, v] of Object.entries(m)) ordemAntiga[id] = v.o;
  const escrever = (doc, id, v) => { (porDoc[doc] ||= {})[id] = v; };

  for (const c of COLECOES) for (const x of dados[c] || []) {
    if (!objeto(x) || typeof x.id !== "string" || !x.id) continue;
    const doc = chaveDe(c, x), item = copia(x), j = canonico(item);
    (vistos[doc] ||= new Set()).add(x.id);
    const antes = base.itens[doc]?.[x.id];
    if (antes && antes.j === j) continue;
    const o = antes?.o ?? ordemAntiga[x.id] ?? agora();
    escrever(doc, x.id, { ...item, _o: o });
    (nova.itens[doc] ||= {})[x.id] = { j, o };
  }
  for (const [doc, m] of Object.entries(base.itens)) for (const id of Object.keys(m)) {
    if (vistos[doc]?.has(id)) continue;
    escrever(doc, id, null);
    delete nova.itens[doc][id];
  }
  const escritas = Object.entries(porDoc).map(([doc, itens]) => ({ doc, itens }));
  const cfg = configSemUsuario(dados.config), jc = canonico(cfg);
  if (jc !== base.config) { escritas.push({ doc: "config", valor: cfg }); nova.config = jc; }
  return { escritas, base: nova };
}

// Primeiro acesso: os fictícios (marcados como exemplo) + o que já estava nas coleções antigas.
export function semear(ficticios, reais = {}, novoId = idPadrao) {
  const f = copia(ficticios);
  for (const c of COLECOES) for (const x of f[c] || []) if (objeto(x)) x.exemplo = true;
  const d = mesclar(f, { alunos: reais.alunos || [], turmas: reais.turmas || [], checkins: reais.checkins || [] });
  delete d.rostos; delete d._turmasFicticiasAdultas;
  return garantirIds(d, novoId);
}

const slug = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "sem-nome";

// Grade do Diário (já validada): id fixo por dia e horário, então importar de novo só atualiza.
export function aplicarGrade(d, turmas) {
  for (const t of turmas) {
    const nome = String(t.professor || "").trim();
    let prof = nome ? d.professores.find(p => p.nome === nome) : null;
    if (nome && !prof) { prof = { id: `pr-${slug(nome)}`, nome, real: true }; d.professores.push(prof); }
    const id = `d-${t.diaSemana}-${t.horario.replace(":", "")}`;
    const nova = { ...t, id, professorId: prof?.id || null, real: true };
    const i = d.turmas.findIndex(x => x.id === id);
    if (i >= 0) d.turmas[i] = nova; else d.turmas.push(nova);
  }
  if (turmas.some(t => t.categoria === "adulto")) d.turmas = d.turmas.filter(x => !(x.categoria === "adulto" && x.exemplo));
  return d;
}

// "Apagar dados de exemplo": sai o movimento fictício; fica o catálogo (planos, modelos, grade...).
const CATALOGO = new Set(["planos", "produtos", "modelosAula", "habilidades", "modelosDoc", "modelosMsg", "perfis", "usuarios", "cronograma", "professores", "turmas"]);
export function semExemplos(d) {
  const r = semAlunos(d, (d.alunos || []).filter(a => a.exemplo).map(a => a.id));
  for (const c of COLECOES) if (!CATALOGO.has(c)) r[c] = r[c].filter(x => !x?.exemplo);
  return r;
}

// Excluir aluno: sai ele e tudo que aponta para ele (presenças, mensalidades, inscrições...).
export function semAlunos(d, ids) {
  const { rostos, ...resto } = d;
  const r = copia(resto);
  if (rostos) r.rostos = rostos;
  const fora = new Set(ids);
  r.alunos = (r.alunos || []).filter(a => !fora.has(a.id));
  for (const c of COLECOES) {
    if (CATALOGO.has(c) || c === "alunos") continue;
    r[c] = (r[c] || []).filter(x => !fora.has(x?.alunoId));
  }
  for (const e of r.eventos || []) if (Array.isArray(e.inscritos)) e.inscritos = e.inscritos.filter(id => !fora.has(id));
  return r;
}
export const temExemplos = d => COLECOES.some(c => !CATALOGO.has(c) && (d[c] || []).some(x => x?.exemplo));
