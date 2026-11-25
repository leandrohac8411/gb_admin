// Portal do aluno, lado do painel: depois de salvar e ao abrir, mantém o espelho (acessos, portal e
// portalGrade) e junta na lista de presença os check-ins que os alunos fizeram pelo celular.
// "nuvem" é o js/nuvem/portal.js (injetado para o teste usar um falso).
import { espelhoAluno, espelhoAcesso, espelhoGrade, mudancasEspelho, podeTerAcesso, emailValido } from "./portal.js";
import { juntarCheckinsAluno } from "./portal-checkin.js";
import { somarDias } from "./datas.js";

export function criarSincroniaPortal({ store, nuvem, hoje }) {
  const memoria = { acessos: new Map(), portal: new Map(), portalGrade: new Map() };
  let fila = Promise.resolve();

  const calcular = () => {
    const d = store.dados, comAcesso = (d.alunos || []).filter(a => podeTerAcesso(a) && emailValido(a.emailPortal));
    return {
      acessos: new Map(comAcesso.map(a => [emailValido(a.emailPortal), espelhoAcesso(a)])),
      portal: new Map(comAcesso.map(a => [a.id, espelhoAluno(d, a, hoje)])),
      portalGrade: new Map([["atual", espelhoGrade(d)]])
    };
  };
  // Uma gravação por vez; a memória só muda depois que o banco confirmou.
  // Uma falha não trava as próximas: a memória não mudou, então a próxima vez tenta de novo.
  const sincronizar = () => (fila = fila.catch(() => {}).then(async () => {
    const novos = calcular();
    for (const colecao of ["portalGrade", "acessos", "portal"]) {
      const m = mudancasEspelho(memoria[colecao], novos[colecao]);
      if (!m.gravar.length && !m.apagar.length) continue;
      await nuvem.gravarEspelho(m, colecao);
      for (const [id, obj] of m.gravar) memoria[colecao].set(id, JSON.stringify(obj));
      for (const id of m.apagar) memoria[colecao].delete(id);
    }
  }));

  return {
    aposSalvar: sincronizar,
    async aoAbrir() {
      const pendentes = await nuvem.checkinsPendentes(somarDias(hoje, -7));
      const { novos, apagar } = juntarCheckinsAluno(store.dados.checkins, pendentes, p => store.novoId(p));
      if (novos.length) { store.dados.checkins.push(...novos); store.salvar(); }
      if (apagar.length) await nuvem.apagarCheckinsAluno(apagar);
      // O que já está no banco entra na memória: assim um acesso que ninguém mais tem é apagado.
      for (const a of await nuvem.lerAcessos()) {
        const { id, alunoId, nome, ativo } = a;
        memoria.acessos.set(id, JSON.stringify({ alunoId, nome, ativo }));
      }
      await sincronizar();
    }
  };
}
