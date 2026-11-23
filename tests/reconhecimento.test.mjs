import { test } from "node:test";
import assert from "node:assert/strict";
import { compactar, descritorValido, reconhecer, descritoresDoRosto } from "../js/logica/reconhecimento.js";

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
