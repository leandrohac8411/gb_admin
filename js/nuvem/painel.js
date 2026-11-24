// Etapa 2: leitura e gravação da coleção "painel" (todos os dados das telas) e da coleção "rostos".
import {
  collection, doc, getDoc, getDocs, onSnapshot, writeBatch, deleteField, FieldPath, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebase.js";
import { paraDocs, semear } from "../logica/baldes.js";

// Ouve as duas coleções; entrega tudo junto, só depois que as duas responderam pela 1ª vez.
export function ouvirPainel(cb, erro) {
  let docs = null, rostos = null;
  const avisar = () => { if (docs && rostos) cb({ docs, rostos }); };
  const p1 = onSnapshot(collection(db, "painel"), s => { docs = Object.fromEntries(s.docs.map(d => [d.id, d.data()])); avisar(); }, erro);
  const p2 = onSnapshot(collection(db, "rostos"), s => { rostos = s.docs.map(d => ({ id: d.id, ...d.data() })); avisar(); }, erro);
  return () => { p1(); p2(); };
}

// Grava as diferenças (logica/baldes.js) num lote só. Documento que já existe: atualiza item por item
// (itens.<id>), para não apagar o que outra pessoa mudou em outro item do mesmo documento.
export function gravarEscritas(escritas, existentes) {
  const lote = writeBatch(db);
  for (const e of escritas) {
    const ref = doc(db, "painel", e.doc);
    if (e.valor) { lote.set(ref, { valor: e.valor }); continue; }
    if (existentes.has(e.doc)) {
      const pares = Object.entries(e.itens).flatMap(([id, v]) => [new FieldPath("itens", id), v === null ? deleteField() : v]);
      lote.update(ref, ...pares);
    } else {
      lote.set(ref, { itens: Object.fromEntries(Object.entries(e.itens).filter(([, v]) => v !== null)) }, { merge: true });
    }
  }
  return lote.commit();
}

// 1º acesso: copia os dados de exemplo + o que já estava nas coleções da etapa 1 (alunos, turmas, check-ins).
// Tudo num lote só, com o painel/meta junto: ou entra tudo, ou nada.
export async function semearSeVazio(gerarFicticios) {
  if ((await getDoc(doc(db, "painel", "meta"))).exists()) return false;
  const ler = async nome => (await getDocs(collection(db, nome))).docs.map(d => ({ id: d.id, ...d.data() }));
  const [alunos, turmas, checkins] = await Promise.all(["alunos", "turmas", "checkins"].map(ler));
  const docs = paraDocs(semear(gerarFicticios(), { alunos, turmas, checkins }));
  const lote = writeBatch(db);
  for (const [id, conteudo] of Object.entries(docs)) {
    lote.set(doc(db, "painel", id), id === "meta" ? { ...conteudo, semeadoEm: serverTimestamp() } : conteudo);
  }
  await lote.commit();
  return true;
}
