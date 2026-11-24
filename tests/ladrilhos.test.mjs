// Foto de grupo: o detector reduz a imagem para 512 px e perde rostos pequenos.
// Procurar também em pedaços sobrepostos deixa cada rosto maior; depois junta sem repetir.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ladrilhos, juntarRostos, tocaBordaInterna } from "../js/logica/ladrilhos.js";

test("ladrilhos: a foto inteira e 4 pedaços sobrepostos que cobrem tudo", () => {
  const l = ladrilhos(1000, 1400);
  assert.equal(l.length, 5);
  assert.deepEqual(l[0], { x: 0, y: 0, w: 1000, h: 1400 });
  for (const t of l.slice(1)) assert.ok(t.x >= 0 && t.y >= 0 && t.x + t.w <= 1000 && t.y + t.h <= 1400);
  // cada ponto da foto está em algum pedaço, com sobra (sobreposição) no meio
  assert.ok(l.slice(1).some(t => t.x === 0 && t.y === 0) && l.slice(1).some(t => t.x + t.w === 1000 && t.y + t.h === 1400));
  assert.ok(l[1].w > 500 && l[1].h > 700, "pedaços se sobrepõem");
});

test("ladrilhos: foto pequena não é cortada", () => {
  assert.equal(ladrilhos(400, 300).length, 1);
});

test("juntarRostos: o mesmo rosto achado em dois pedaços vira um só (fica o de maior certeza)", () => {
  const r = juntarRostos([
    { x: 100, y: 100, w: 40, h: 40, confianca: 0.7 },
    { x: 102, y: 98, w: 42, h: 41, confianca: 0.95 },
    { x: 300, y: 100, w: 40, h: 40, confianca: 0.6 }
  ]);
  assert.equal(r.length, 2);
  assert.equal(r.find(x => x.x < 200).confianca, 0.95);
});

test("tocaBordaInterna: rosto cortado na borda de um pedaço (que não é borda da foto) é descartado", () => {
  const t = { x: 0, y: 0, w: 600, h: 800 };
  assert.equal(tocaBordaInterna({ x: 580, y: 100, w: 20, h: 20 }, t, 1000, 1400), true);
  assert.equal(tocaBordaInterna({ x: 0, y: 100, w: 20, h: 20 }, t, 1000, 1400), false, "borda da própria foto vale");
  assert.equal(tocaBordaInterna({ x: 300, y: 300, w: 20, h: 20 }, t, 1000, 1400), false);
});

import { semFundo } from "../js/logica/ladrilhos.js";
test("semFundo: tira rostos bem menores que os da turma (gente lá no fundo da sala)", () => {
  const turma = [55, 53, 52, 60, 53, 55, 54, 54, 59, 52].map((w, i) => ({ x: i * 100, y: 0, w, h: w, confianca: 0.99 }));
  const fundo = [16, 22, 27].map((w, i) => ({ x: 500 + i * 10, y: 200, w, h: w, confianca: 0.5 }));
  assert.equal(semFundo([...turma, ...fundo]).length, 10);
  assert.equal(semFundo([{ x: 0, y: 0, w: 400, h: 400, confianca: 1 }]).length, 1, "um rosto só fica");
  assert.deepEqual(semFundo([]), []);
});
