// Portal do aluno: check-in pelo celular. Plano 2026-11-25, tarefa 2.
import { test } from "node:test";
import assert from "node:assert/strict";
import { turmaDoCheckin, idCheckinAluno, juntarCheckinsAluno } from "../js/logica/portal-checkin.js";
import { avaliarLocal, ACADEMIA } from "../js/logica/local.js";

const min = h => { const [a, b] = h.split(":").map(Number); return a * 60 + b; };
const turmas = [
  { id: "t1230", diaSemana: 3, horario: "12:30", duracaoMin: 60 },
  { id: "t19a", diaSemana: 3, horario: "19:00", duracaoMin: 60 },
  { id: "t19b", diaSemana: 3, horario: "19:00" },
  { id: "tqui", diaSemana: 4, horario: "12:30", duracaoMin: 60 }
];

test("turmaDoCheckin: de 30 min antes do início até o fim da aula", () => {
  assert.deepEqual(turmaDoCheckin(turmas, 3, min("12:00")), { turma: turmas[0] });
  assert.deepEqual(turmaDoCheckin(turmas, 3, min("13:30")), { turma: turmas[0] });
  assert.deepEqual(turmaDoCheckin(turmas, 3, min("11:59")), { nenhuma: true });
  assert.deepEqual(turmaDoCheckin(turmas, 3, min("13:31")), { nenhuma: true });
});

test("turmaDoCheckin: duas turmas no mesmo horário pedem para escolher", () => {
  assert.deepEqual(turmaDoCheckin(turmas, 3, min("19:05")), { escolher: [turmas[1], turmas[2]] });
});

test("idCheckinAluno: um por aluno, turma e dia", () => {
  assert.equal(idCheckinAluno("a1", "t1230", "2026-11-25"), "a1_t1230_2026-11-25");
});

test("juntarCheckinsAluno: vira presença sem duplicar, e o pendente é apagado", () => {
  let n = 0;
  const checkins = [{ id: "c1", alunoId: "a2", turmaId: "t1230", data: "2026-11-25", hora: "12:30" }];
  const pendentes = [
    { id: "a1_t1230_2026-11-25", alunoId: "a1", turmaId: "t1230", data: "2026-11-25", hora: "12:31" },
    { id: "a2_t1230_2026-11-25", alunoId: "a2", turmaId: "t1230", data: "2026-11-25", hora: "12:29" },
    { id: "dup", alunoId: "a1", turmaId: "t1230", data: "2026-11-25", hora: "12:40" }
  ];
  const r = juntarCheckinsAluno(checkins, pendentes, p => `${p}${++n}`);
  assert.deepEqual(r.novos, [{ id: "c1", alunoId: "a1", turmaId: "t1230", data: "2026-11-25", hora: "12:31", origem: "aluno" }]);
  assert.deepEqual(r.apagar, ["a1_t1230_2026-11-25", "a2_t1230_2026-11-25", "dup"]);
});

test("avaliarLocal: 40 m da academia passa, 120 m não", () => {
  const perto = { lat: ACADEMIA.lat + 40 / 111320, lng: ACADEMIA.lng, precisao: 10 };
  const longe = { lat: ACADEMIA.lat + 120 / 111320, lng: ACADEMIA.lng, precisao: 10 };
  assert.equal(avaliarLocal(perto).ok, true);
  assert.equal(avaliarLocal(longe).ok, false);
});
