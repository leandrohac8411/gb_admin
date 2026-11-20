// Academia fictícia para a vitrine. Determinística: mesma data + mesma semente = mesmos dados.
import { somarDias, diasEntre, diaSemana, deISO } from "./logica/datas.js";
import { gerarExtras, COLECOES_EXTRAS } from "./dados-extras.js";

export const VERSAO = 4;
export const DIAS_CHECKIN = 120;
export const COLECOES = ["professores", "turmas", "alunos", "checkins", "mensalidades", "graduacoes", ...COLECOES_EXTRAS];

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HOMENS = ["Lucas", "Gabriel", "Rafael", "Mateus", "Pedro", "Thiago", "Felipe", "Bruno", "Gustavo", "Rodrigo",
  "André", "Vinícius", "João", "Caio", "Daniel", "Eduardo", "Leonardo", "Henrique", "Igor", "Marcelo", "Otávio", "Samuel"];
const MULHERES = ["Ana", "Beatriz", "Camila", "Débora", "Fernanda", "Gabriela", "Helena", "Isabela", "Júlia",
  "Larissa", "Mariana", "Natália", "Paula", "Renata", "Sofia", "Tainá", "Vitória", "Yasmin"];
const SOBRENOMES = ["Almeida", "Barbosa", "Cardoso", "Duarte", "Esteves", "Farias", "Gomes", "Holanda", "Lima", "Machado",
  "Nogueira", "Oliveira", "Pereira", "Queiroz", "Ribeiro", "Santos", "Teixeira", "Vasconcelos", "Xavier", "Ávila"];

const PROFESSORES = [
  { id: "p1", nome: "Rafael Monteiro", faixa: "preta", graus: 2 },
  { id: "p2", nome: "Camila Duarte", faixa: "preta", graus: 1 },
  { id: "p3", nome: "Bruno Teixeira", faixa: "marrom", graus: 3 },
  { id: "p4", nome: "Diego Farias", faixa: "preta", graus: 0 },
  { id: "p5", nome: "Lucas Prado", faixa: "marrom", graus: 1 }
];

// Grade real da GB Sobradinho (adulto). Programas e professores são fictícios.
const GRADE = [
  [1, "12:30", "GB1", "p4"], [1, "19:00", "GB1+GB2", "p1"], [1, "20:00", "GB2", "p1"],
  [2, "07:00", "GB1", "p5"], [2, "19:00", "GB1", "p2"], [2, "20:00", "GB2", "p3"],
  [3, "12:30", "GB1", "p4"], [3, "19:00", "GB1+GB2", "p1"], [3, "20:00", "GB2", "p1"],
  [4, "07:00", "GB1", "p5"], [4, "19:00", "GB1", "p2"], [4, "20:00", "GB2", "p3"],
  [5, "12:30", "GB1+GB2", "p4"], [5, "19:00", "GB2", "p2"],
  [6, "10:00", "GB1+GB2", "p1"]
];

// Turmas kids (fictícias): [dia, horário, professor, idade mín, idade máx]
const GRADE_KIDS = [
  [1, "17:00", "p2", 4, 6], [1, "18:00", "p5", 7, 10], [3, "17:00", "p2", 4, 6], [3, "18:00", "p5", 7, 10],
  [2, "17:00", "p3", 7, 10], [2, "18:00", "p3", 11, 15], [4, "17:00", "p3", 7, 10], [4, "18:00", "p3", 11, 15],
  [6, "09:00", "p2", 4, 15]
];
export const publicoKids = (min, max) => (min <= 4 && max >= 15 ? "Todas as idades" : `${min}–${max} anos`);

// Crianças: [nome, sexo, faixa, graus, idade]
const KIDS = [
  ["Miguel", "M", "branca", 0, 5], ["Alice", "F", "branca", 2, 4], ["Davi", "M", "cinza-branca", 3, 5],
  ["Laura", "F", "cinza", 1, 6], ["Arthur", "M", "cinza-preta", 4, 6], ["Valentina", "F", "cinza-preta", 4, 7],
  ["Heitor", "M", "amarela-branca", 2, 8], ["Helena", "F", "amarela", 0, 9], ["Bernardo", "M", "amarela-preta", 3, 9],
  ["Cecília", "F", "laranja-branca", 1, 10], ["Theo", "M", "laranja", 4, 11], ["Manuela", "F", "laranja-preta", 2, 12],
  ["Gael", "M", "verde-branca", 3, 13], ["Lívia", "F", "verde", 1, 14], ["Noah", "M", "verde-preta", 4, 15],
  ["Isadora", "F", "verde-preta", 2, 16], ["Benício", "M", "amarela", 1, 8], ["Antonella", "F", "branca", 1, 7]
];
const PAIS = [["Ana", "mãe"], ["Marcos", "pai"], ["Juliana", "mãe"], ["Ricardo", "pai"], ["Fernanda", "mãe"], ["Paulo", "pai"]];
const ALERGIAS = ["", "", "Alergia a amendoim", "", "Asma leve (bombinha na mochila)", "", "", "Rinite"];

export const idTurma = (dia, horario) => `${dia}-${horario.replace(":", "")}`;

// [faixa, quantidade, anos de treino mín..máx, anos na faixa mín..máx]
const DISTRIBUICAO = [
  ["branca", 16, [0.15, 1.6], null],
  ["azul", 12, [2.2, 4.5], [0.4, 2.6]],
  ["roxa", 7, [4.5, 6.5], [0.5, 2]],
  ["marrom", 3, [6.5, 8.5], [0.4, 1.4]],
  ["preta", 2, [9, 14], [1, 4]]
];
const PLANOS = { Mensal: 280, Trimestral: 750, Anual: 2700 };
const TRANCADOS = new Set([5, 18, 30]);
const ATRASADOS = new Set([2, 11, 23, 34]);
const NOVOS = new Map([[0, 9], [9, 21]]);          // matriculados há N dias
const SUMIDOS = new Map([[7, 19], [15, 27], [26, 41]]); // pararam de treinar há N dias   // índices de alunos ativos de plano Mensal

const competenciaDe = iso => iso.slice(0, 7);
function mesesAntes(competencia, n) {
  let [a, m] = competencia.split("-").map(Number);
  m -= n; while (m < 1) { m += 12; a--; }
  return `${a}-${String(m).padStart(2, "0")}`;
}

export function gerarDados(hojeISO, semente = 7) {
  const rnd = mulberry32(semente);
  const entre = (a, b) => a + rnd() * (b - a);
  const inteiro = (a, b) => Math.floor(entre(a, b + 1));
  const anosAtras = anos => somarDias(hojeISO, -Math.round(anos * 365));

  const turmas = GRADE.map(([diaSemana_, horario, programa, professorId]) =>
    ({ id: idTurma(diaSemana_, horario), diaSemana: diaSemana_, horario, programa, professorId, duracaoMin: 60, categoria: "adulto" }));
  for (const [dia, horario, professorId, idadeMin, idadeMax] of GRADE_KIDS) {
    turmas.push({ id: idTurma(dia, horario), diaSemana: dia, horario, programa: "Kids", professorId, duracaoMin: 50, categoria: "kids",
      idadeMin, idadeMax, publico: publicoKids(idadeMin, idadeMax) });
  }

  const alunos = [], graduacoes = [];
  let i = 0;
  for (const [faixa, qtd, treino, naFaixa] of DISTRIBUICAO) {
    for (let k = 0; k < qtd; k++, i++) {
      const sexo = i % 3 === 1 ? "F" : "M";
      const primeiro = sexo === "F" ? MULHERES[(i * 7) % MULHERES.length] : HOMENS[(i * 5) % HOMENS.length];
      const nome = `${primeiro} ${SOBRENOMES[(i * 3) % SOBRENOMES.length]} ${SOBRENOMES[(i * 7 + 5) % SOBRENOMES.length]}`;
      const desde = NOVOS.has(i) ? (entre(...treino), somarDias(hojeISO, -NOVOS.get(i))) : anosAtras(entre(...treino));
      const desdeFaixa = naFaixa ? anosAtras(Math.min(entre(...naFaixa), diasEntre(desde, hojeISO) / 365 - 0.1)) : desde;
      const graus = NOVOS.has(i) ? (inteiro(0, 4), 0) : inteiro(0, 4);
      const intervalo = Math.floor(diasEntre(desdeFaixa, hojeISO) / (graus + 1.4));
      const ultimaGraduacao = graus ? somarDias(desdeFaixa, graus * intervalo) : desdeFaixa;
      if (faixa !== "branca") graduacoes.push({ alunoId: `a${String(i + 1).padStart(2, "0")}`, data: desdeFaixa, faixa, graus: 0 });
      for (let g = 1; g <= graus; g++) graduacoes.push({ alunoId: `a${String(i + 1).padStart(2, "0")}`, data: somarDias(desdeFaixa, g * intervalo), faixa, graus: g });
      const plano = i % 8 === 7 ? "Anual" : i % 5 === 4 ? "Trimestral" : "Mensal";
      const idade = inteiro(17, 48);
      alunos.push({
        id: `a${String(i + 1).padStart(2, "0")}`, nome, sexo,
        nascimento: `${deISO(hojeISO).ano - idade}-${String(inteiro(1, 12)).padStart(2, "0")}-${String(inteiro(1, 28)).padStart(2, "0")}`,
        peso: sexo === "F" ? inteiro(52, 78) : inteiro(62, 102),
        telefone: `(61) 9${inteiro(8100, 9999)}-${inteiro(1000, 9999)}`,
        categoria: "adulto", faixa, graus, desde, desdeFaixa, ultimaGraduacao,
        status: TRANCADOS.has(i) ? "trancado" : "ativo",
        plano, valor: PLANOS[plano], vencimentoDia: [5, 10, 15][i % 3],
        parouEm: SUMIDOS.has(i) ? somarDias(hojeISO, -SUMIDOS.get(i)) : null
      });
    }
  }
  // Atrasados precisam ser ativos e de plano Mensal.
  for (const idx of ATRASADOS) Object.assign(alunos[idx], { plano: "Mensal", valor: PLANOS.Mensal, status: "ativo" });

  // Crianças: responsável, saúde e faixas coerentes com a idade.
  KIDS.forEach(([primeiro, sexo, faixa, graus, idade], k) => {
    const id = `k${String(k + 1).padStart(2, "0")}`;
    const sobrenome = `${SOBRENOMES[(k * 5 + 2) % SOBRENOMES.length]} ${SOBRENOMES[(k * 3 + 9) % SOBRENOMES.length]}`;
    const nascimento = somarDias(hojeISO, -(idade * 365 + Math.floor(idade / 4) + inteiro(20, 300)));
    // A maioria graduou há pouco (1 a 10 semanas); 1 em cada 3 está há mais tempo e pode estar apta.
    const ultimaGraduacao = somarDias(hojeISO, -(k % 3 === 0 || graus === 4 ? inteiro(100, 160) : inteiro(10, 70)));
    // Com graus, está na faixa há 200–420 dias; sem graus, entrou na faixa na última graduação.
    const desdeFaixa = graus ? somarDias(hojeISO, -inteiro(200, 420)) : ultimaGraduacao;
    const desde = faixa === "branca" ? desdeFaixa : somarDias(desdeFaixa, -inteiro(150, 500));
    const intervalo = graus ? Math.max(1, Math.floor(diasEntre(desdeFaixa, ultimaGraduacao) / graus)) : 0;
    if (faixa !== "branca") graduacoes.push({ alunoId: id, data: desdeFaixa, faixa, graus: 0 });
    for (let g = 1; g <= graus; g++) graduacoes.push({ alunoId: id, data: g === graus ? ultimaGraduacao : somarDias(desdeFaixa, g * intervalo), faixa, graus: g });
    const [pai, parentesco] = PAIS[k % PAIS.length];
    const telefone = `(61) 9${inteiro(8100, 9999)}-${inteiro(1000, 9999)}`;
    alunos.push({
      id, nome: `${primeiro} ${sobrenome}`, sexo, nascimento, peso: inteiro(16, 55), telefone,
      categoria: "kids", faixa, graus, desde, desdeFaixa, ultimaGraduacao, status: k === 16 ? "trancado" : "ativo",
      plano: "Kids", valor: 220, vencimentoDia: 10, parouEm: null,
      responsavel: { nome: `${pai} ${sobrenome.split(" ")[0]}`, parentesco, telefone, buscam: k % 3 === 0 ? "Mãe, pai e avó" : "Pai e mãe" },
      saude: ALERGIAS[k % ALERGIAS.length], autorizaImagem: k % 4 !== 2
    });
  });

  // Check-ins: cada aluno tem 2 ou 3 turmas preferidas (da sua categoria e idade) e vai em ~70% delas.
  const checkins = [];
  const inicio = somarDias(hojeISO, -(DIAS_CHECKIN - 1));
  const preferidas = new Map(alunos.map(a => {
    const idade = Math.min(15, Math.floor(diasEntre(a.nascimento, hojeISO) / 365.25));  // 16+ ainda treina com os juniors
    const opcoes = turmas.filter(t => t.categoria === a.categoria && (t.categoria === "adulto" || (idade >= t.idadeMin && idade <= t.idadeMax)));
    const n = Math.min(opcoes.length, inteiro(2, 3)), escolhidas = new Set();
    while (escolhidas.size < n) escolhidas.add(opcoes[inteiro(0, opcoes.length - 1)].id);
    return [a.id, [...escolhidas].map(id => turmas.find(t => t.id === id))];
  }));
  for (let d = inicio; d <= hojeISO; d = somarDias(d, 1)) {
    const ds = diaSemana(d);
    for (const a of alunos) {
      if (a.status !== "ativo" || a.desde > d || (a.parouEm && d > a.parouEm)) continue;
      for (const t of preferidas.get(a.id)) {
        if (t.diaSemana === ds && rnd() < 0.7) checkins.push({ id: `c${checkins.length + 1}`, alunoId: a.id, turmaId: t.id, data: d, hora: t.horario });
      }
    }
  }

  // Mensalidades do mês atual e dos 2 anteriores.
  const mensalidades = [];
  const atual = competenciaDe(hojeISO);
  const idsAtrasados = new Set([...ATRASADOS].map(idx => alunos[idx].id));
  for (let n = 2; n >= 0; n--) {
    const comp = mesesAntes(atual, n);
    for (const a of alunos) {
      if (a.status !== "ativo" || competenciaDe(a.desde) > comp) continue;
      const passo = a.plano === "Anual" ? 12 : a.plano === "Trimestral" ? 3 : 1;
      const [ad, md] = a.desde.split("-").map(Number), [ac, mc] = comp.split("-").map(Number);
      if (((ac - ad) * 12 + (mc - md)) % passo !== 0) continue;
      const vencimento = `${comp}-${String(a.vencimentoDia).padStart(2, "0")}`;
      let pagoEm = null;
      if (idsAtrasados.has(a.id) && n <= 1) pagoEm = null;
      else if (vencimento < hojeISO || rnd() < 0.35) pagoEm = somarDias(vencimento, -inteiro(0, 4));
      if (pagoEm && pagoEm > hojeISO) pagoEm = hojeISO;
      mensalidades.push({ id: `m${mensalidades.length + 1}`, alunoId: a.id, competencia: comp, vencimento, valor: a.valor, pagoEm, forma: pagoEm ? ["Pix", "Cartão", "Dinheiro"][inteiro(0, 2)] : null });
    }
  }

  return { versao: VERSAO, geradoEm: hojeISO, professores: PROFESSORES.map(p => ({ ...p })), turmas, alunos, checkins, mensalidades, graduacoes, ...gerarExtras(hojeISO, alunos) };
}
