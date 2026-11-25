// Foto da aula guardada no painel logado (coleção "fotos" do Firestore, uma por aula), 25/11/2026.
import { test } from "node:test";
import assert from "node:assert/strict";
import { idFotoAula, semAutorizacao, fotoAulaNuvem, LIMITE_FOTO } from "../js/logica/foto-aula.js";

const jpeg = n => "data:image/jpeg;base64," + "A".repeat(n);

test("id da foto: uma por aula (turma + dia)", () => {
  assert.equal(idFotoAula("t3-1230", "2026-11-25"), "t3-1230_2026-11-25");
});

test("criança sem autorização de imagem impede guardar; adulto não precisa do campo", () => {
  const alunos = {
    k1: { id: "k1", nome: "Lia", categoria: "kids", autorizaImagem: true },
    k2: { id: "k2", nome: "Téo", categoria: "kids", autorizaImagem: false },
    k3: { id: "k3", nome: "Bia", categoria: "kids" },
    a1: { id: "a1", nome: "Ana", categoria: "adulto" }
  };
  assert.deepEqual(semAutorizacao(["k1", "a1"], alunos), []);
  assert.deepEqual(semAutorizacao(["k1", "k2", "k3", "a1", "sumiu"], alunos), ["Téo", "Bia"]);
});

test("só vai para o banco foto JPEG dentro do limite, dia válido e legenda curta", () => {
  const ok = fotoAulaNuvem({ turmaId: "t3-1230", data: "2026-11-25", foto: jpeg(1000), legenda: "  drill  ", professorId: "p1", extra: 1 });
  assert.deepEqual(ok, { turmaId: "t3-1230", data: "2026-11-25", foto: jpeg(1000), legenda: "drill", professorId: "p1" });
  assert.equal(fotoAulaNuvem({ turmaId: "t1", data: "2026-11-25", foto: jpeg(LIMITE_FOTO) }), null, "grande demais");
  assert.equal(fotoAulaNuvem({ turmaId: "t1", data: "25/11/2026", foto: jpeg(10) }), null);
  assert.equal(fotoAulaNuvem({ turmaId: "t1", data: "2026-11-25", foto: "data:image/png;base64,AAAA" }), null);
  assert.equal(fotoAulaNuvem({ turmaId: "t/1", data: "2026-11-25", foto: jpeg(10) }), null);
  assert.equal(fotoAulaNuvem({ turmaId: "t1", data: "2026-11-25", foto: jpeg(10), legenda: "x".repeat(200) }).legenda.length, 140);
});
