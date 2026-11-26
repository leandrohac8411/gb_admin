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

// criadoEm = hora do servidor (ms). Brasília é UTC-3: 12:31 local = 15:31 UTC.
const ms = (data, hhmm) => Date.parse(`${data}T${hhmm}:00-03:00`);
const grade = [{ id: "t1230", diaSemana: 3, horario: "12:30", duracaoMin: 60, categoria: "adulto" }, { id: "tk", diaSemana: 3, horario: "17:00", categoria: "kids" }];
const p = (id, extra) => ({ id, alunoId: "a1", turmaId: "t1230", data: "2026-11-25", hora: "12:31", criadoEm: ms("2026-11-25", "12:31"), ...extra });

test("juntarCheckinsAluno: vira presença com id fixo (dois painéis não duplicam), sem repetir, e o pendente é apagado", () => {
  const checkins = [{ id: "c1", alunoId: "a2", turmaId: "t1230", data: "2026-11-25", hora: "12:30" }];
  const pendentes = [p("a1_t1230_2026-11-25"), p("a2_t1230_2026-11-25", { alunoId: "a2" }), p("dup", { hora: "12:40" })];
  const r = juntarCheckinsAluno(checkins, pendentes, { turmas: grade, hoje: "2026-11-25" });
  assert.deepEqual(r.novos, [{ id: "ca_a1_t1230_2026-11-25", alunoId: "a1", turmaId: "t1230", data: "2026-11-25", hora: "12:31", origem: "aluno" }]);
  assert.deepEqual(r.apagar, ["a1_t1230_2026-11-25", "a2_t1230_2026-11-25", "dup"]);
  const outroPainel = juntarCheckinsAluno([], [pendentes[0]], { turmas: grade, hoje: "2026-11-25" });
  assert.equal(outroPainel.novos[0].id, r.novos[0].id, "o mesmo id nos dois aparelhos");
});

test("juntarCheckinsAluno: check-in forjado não vira presença (e é apagado)", () => {
  const ruins = [
    p("x1", { turmaId: "inventada" }),                                         // turma que não existe
    p("x2", { turmaId: "tk" }),                                                // turma kids
    p("x3", { data: "2026-11-24", criadoEm: ms("2026-11-24", "12:31") }),      // terça: a turma é de quarta
    p("x4", { data: "2026-12-02", criadoEm: ms("2026-12-02", "12:31") }),      // futuro
    p("x5", { criadoEm: ms("2026-11-26", "12:31") }),                         // criado em outro dia
    p("x6", { criadoEm: ms("2026-11-25", "18:00") }),                         // fora do horário da aula
    p("x7", { criadoEm: undefined })                                          // sem hora do servidor
  ];
  const r = juntarCheckinsAluno([], ruins, { turmas: grade, hoje: "2026-11-25" });
  assert.deepEqual(r.novos, []);
  assert.deepEqual(r.apagar, ruins.map(x => x.id));
  const bom = juntarCheckinsAluno([], [p("ok", { criadoEm: ms("2026-11-25", "12:00") })], { turmas: grade, hoje: "2026-11-26" });
  assert.equal(bom.novos.length, 1, "30 min antes do início vale, e o painel pode juntar no dia seguinte");
  const depois = juntarCheckinsAluno([], [p("ok2", { criadoEm: ms("2026-11-25", "14:20") })], { turmas: grade, hoje: "2026-11-25" });
  assert.equal(depois.novos.length, 1, "até 1 hora depois do fim da aula ainda vale (o aluno escreve o diário depois do treino)");
});

test("avaliarLocal: 40 m da academia passa, 120 m não", () => {
  const perto = { lat: ACADEMIA.lat + 40 / 111320, lng: ACADEMIA.lng, precisao: 10 };
  const longe = { lat: ACADEMIA.lat + 120 / 111320, lng: ACADEMIA.lng, precisao: 10 };
  assert.equal(avaliarLocal(perto).ok, true);
  assert.equal(avaliarLocal(longe).ok, false);
});
