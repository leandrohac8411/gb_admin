// Dados vivos do aluno no formato do Diário de Tatame (perfil, aulas, grade, currículo e âncoras),
// montados do espelho do GB Admin + o que o aluno escreveu. "pronto" quando o espelho e a grade chegaram.
import * as n from "./nuvem.js";
import { definirAluno } from "./dados.js";
import { montarEstadoDiario } from "../logica/portal-diario.js";

export function iniciarEstado(usuario, acesso, onMudar) {
  const fontes = { portal: undefined, grade: undefined, diario: [], pendentes: [], prefs: {} };
  const e = { uid: usuario.uid, email: usuario.email, nome: acesso.nome, alunoId: acesso.alunoId, perfil: null, aulas: null, grade: null, curriculo: null, ancoras: null, pronto: false, erro: null };
  definirAluno({ alunoId: acesso.alunoId, presente: (turmaId, data) => (e.aulas || []).some(a => a.turmaId === turmaId && a.data === data) });
  const montar = () => {
    if (fontes.portal === undefined || fontes.grade === undefined) return;
    Object.assign(e, montarEstadoDiario(fontes), { pronto: true, academia: fontes.grade?.academia || null });
    onMudar();
  };
  const falhou = err => {
    console.error(err);
    e.erro = err?.code === "permission-denied" ? "O banco recusou o acesso. Se a academia tirou seu acesso, fale com o professor."
      : "Não consegui carregar os dados. Confira a internet e abra de novo.";
    onMudar();
  };
  const paradas = [
    n.ouvirPortal(acesso.alunoId, p => { fontes.portal = p; montar(); }, falhou),
    n.ouvirGrade(g => { fontes.grade = g; montar(); }, falhou),
    n.ouvirDiario(acesso.alunoId, l => { fontes.diario = l; montar(); }, err => console.error(err)),
    n.meusCheckins(acesso.alunoId, l => { fontes.pendentes = l; montar(); }, err => console.error(err)),
    n.ouvirPreferencias(acesso.alunoId, p => { fontes.prefs = p; montar(); }, err => console.error(err))
  ];
  e.parar = () => paradas.forEach(f => f());
  return e;
}
