// Professor que também treina: ele fica com uma ficha de aluno ligada (professor.alunoId), onde contam
// presença, frequência e graduação. A ficha não gera mensalidade nem contrato (plano "Professor").
const chave = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase().replace(/\s+/g, " ");

export function professorTreina(d, prof, treina, { hoje, novoId, real = false }) {
  if (!treina) {
    // Não treina: fica só como professor. Ficha sem nenhum treino some; com histórico, é trancada
    // (sai das listas de alunos e os treinos ficam, para voltar se ele treinar de novo).
    const ficha = d.alunos.find(a => a.id === prof.alunoId);
    prof.alunoId = "";
    if (ficha?.plano === "Professor" && ficha.status === "ativo") {
      const usou = ["checkins", "graduacoes", "mensalidades"].some(c => (d[c] || []).some(x => x.alunoId === ficha.id));
      if (usou) { ficha.status = "trancado"; ficha.trancamento = { data: hoje, motivo: "Professor que não treina", obs: "" }; }
      else d.alunos = d.alunos.filter(a => a !== ficha);
    }
    return { aluno: null, criado: false };
  }
  const ligadas = new Set(d.professores.filter(p => p !== prof && p.alunoId).map(p => p.alunoId));
  let aluno = d.alunos.find(a => a.id === prof.alunoId)
    || d.alunos.find(a => !ligadas.has(a.id) && (a.categoria || "adulto") === "adulto" && chave(a.nome) === chave(prof.nome));
  let criado = false;
  if (!aluno) {
    aluno = { id: novoId("a"), nome: prof.nome, categoria: "adulto", faixa: prof.faixa || "preta", graus: Number(prof.graus) || 0,
      plano: "Professor", valor: 0, desde: hoje, desdeFaixa: hoje, ultimaGraduacao: hoje, status: "ativo", vencimentoDia: 10 };
    if (real) aluno.real = true;
    d.alunos.unshift(aluno);
    criado = true;
  } else if (prof.alunoId === aluno.id) {
    // Já ligado: a ficha acompanha o que foi editado no professor.
    Object.assign(aluno, { nome: prof.nome, faixa: prof.faixa || aluno.faixa, graus: Number(prof.graus) || 0 });
  }
  if (aluno.status !== "ativo") { aluno.status = "ativo"; delete aluno.trancamento; }
  prof.alunoId = aluno.id;
  return { aluno, criado };
}
